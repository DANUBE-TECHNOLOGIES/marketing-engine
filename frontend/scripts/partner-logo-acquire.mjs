import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");
const publicPartners = path.join(frontendRoot, "public", "partners");

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [backlogModule, cruiseModule, circuitModule, stayModule, longHaulModule, franceEuropeModule] = await Promise.all([
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerCruiseLogoSources.js"),
  loadModule("partnerCircuitLogoSources.js"),
  loadModule("partnerStayLogoSources.js"),
  loadModule("partnerLongHaulLogoSources.js"),
  loadModule("partnerFranceEuropeLogoSources.js"),
]);

const registries = Object.freeze({
  croisieres: cruiseModule.PARTNER_CRUISE_LOGO_SOURCES || {},
  circuits: circuitModule.PARTNER_CIRCUIT_LOGO_SOURCES || {},
  sejours: stayModule.PARTNER_STAY_LOGO_SOURCES || {},
  "sur-mesure": longHaulModule.PARTNER_LONG_HAUL_LOGO_SOURCES || {},
  "france-europe": franceEuropeModule.PARTNER_FRANCE_EUROPE_LOGO_SOURCES || {},
});
const backlogById = new Map((backlogModule.PARTNER_LOGO_BACKLOG || []).map((item) => [item.id, item]));

const partnerArg = process.argv.find((arg) => arg.startsWith("--partner="));
const write = process.argv.includes("--write=true");
const overwrite = process.argv.includes("--overwrite=true");
const partnerId = String(partnerArg?.split("=", 2)[1] || "").trim();

if (!partnerId) {
  console.error(JSON.stringify({ ok: false, error: "missing --partner=<id>" }, null, 2));
  process.exit(2);
}

const backlog = backlogById.get(partnerId) || null;
if (!backlog) {
  console.error(JSON.stringify({ ok: false, partnerId, error: "partner-not-in-logo-backlog" }, null, 2));
  process.exit(2);
}
if (backlog.state !== "source-vetted") {
  console.error(JSON.stringify({
    ok: false,
    partnerId,
    error: "source-not-vetted",
    backlogState: backlog.state,
    requiredState: "source-vetted",
  }, null, 2));
  process.exit(2);
}

const registry = registries[backlog.category] || {};
const source = registry[partnerId] || null;
const sourceUrl = String(source?.preferredSource || source?.assetUrl || "").trim();
if (!source || source.status !== "vetted-source" || !sourceUrl) {
  console.error(JSON.stringify({
    ok: false,
    partnerId,
    error: "vetted-registry-source-missing",
    registryStatus: source?.status || null,
  }, null, 2));
  process.exit(2);
}

function commandExists(command) {
  return spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
}

async function downloadAsset(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAcquisition/2.1)",
      accept: "image/svg+xml,image/webp,image/png,image/*;q=0.9,*/*;q=0.1",
    },
  });
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100) throw new Error("downloaded asset is unexpectedly small");
  return { buffer, finalUrl: response.url, contentType: response.headers.get("content-type") || "" };
}

function detectFormat(buffer, contentType, url) {
  const text = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
  if (/image\/svg\+xml/i.test(contentType) || /<svg\b/i.test(text) || /\.svg(?:$|[?#])/i.test(url)) return "svg";
  if (/image\/webp/i.test(contentType) || buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (/image\/png/i.test(contentType) || buffer.subarray(1, 4).toString("ascii") === "PNG") return "png";
  throw new Error(`unsupported asset format: ${contentType || "unknown"}`);
}

async function convertToWebp(inputPath, outputPath, inputFormat) {
  if (commandExists("magick")) {
    run("magick", [inputPath, "-background", "none", "-resize", "520x180>", "-gravity", "center", "-extent", "600x240", "-quality", "88", outputPath]);
    return "imagemagick-magick";
  }
  if (commandExists("convert")) {
    run("convert", [inputPath, "-background", "none", "-resize", "520x180>", "-gravity", "center", "-extent", "600x240", "-quality", "88", outputPath]);
    return "imagemagick-convert";
  }
  if (inputFormat === "svg" && commandExists("rsvg-convert") && commandExists("cwebp")) {
    const pngPath = `${outputPath}.png`;
    run("rsvg-convert", ["-w", "520", "-h", "180", "-o", pngPath, inputPath]);
    run("cwebp", ["-quiet", "-q", "88", "-alpha_q", "100", pngPath, "-o", outputPath]);
    fs.rmSync(pngPath, { force: true });
    return "rsvg-cwebp";
  }
  if (inputFormat === "png" && commandExists("cwebp")) {
    run("cwebp", ["-quiet", "-q", "88", "-alpha_q", "100", inputPath, "-o", outputPath]);
    return "cwebp";
  }
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default || sharpModule;
    await sharp(inputPath)
      .resize(520, 180, { fit: "inside", withoutEnlargement: true })
      .extend({ top: 30, bottom: 30, left: 40, right: 40, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(outputPath);
    return "sharp";
  } catch {
    return null;
  }
}

function existingAcceptedAssets(id) {
  return ["webp", "svg"]
    .map((format) => path.join(publicPartners, `${id}.${format}`))
    .filter((filePath) => fs.existsSync(filePath));
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mle-partner-logo-"));
try {
  const downloaded = await downloadAsset(sourceUrl);
  const format = detectFormat(downloaded.buffer, downloaded.contentType, downloaded.finalUrl);
  const sourcePath = path.join(tempDir, `${partnerId}.${format}`);
  fs.writeFileSync(sourcePath, downloaded.buffer);

  let outputFormat = format;
  let generatedPath = sourcePath;
  let converter = "none-required";

  if (format === "svg" || format === "png") {
    const webpPath = path.join(tempDir, `${partnerId}.webp`);
    const convertedBy = await convertToWebp(sourcePath, webpPath, format);
    if (convertedBy) {
      outputFormat = "webp";
      generatedPath = webpPath;
      converter = convertedBy;
    } else if (format === "svg") {
      converter = "none-keep-vetted-svg";
    } else {
      throw new Error("PNG source requires a WebP converter; refusing to publish PNG outside the accepted public asset policy");
    }
  }

  if (!["webp", "svg"].includes(outputFormat)) {
    throw new Error(`output format ${outputFormat} violates accepted public asset policy`);
  }

  const targetName = `${partnerId}.${outputFormat}`;
  const targetPath = path.join(publicPartners, targetName);
  const generatedBytes = fs.statSync(generatedPath).size;
  const existingAssets = existingAcceptedAssets(partnerId);

  if (write && existingAssets.length && !overwrite) {
    throw new Error(`partner already has accepted public asset(s): ${existingAssets.map((filePath) => path.basename(filePath)).join(", ")}; pass --overwrite=true only after explicit review`);
  }

  const payload = {
    ok: true,
    partnerId,
    category: backlog.category,
    source: downloaded.finalUrl,
    sourceContentType: downloaded.contentType,
    registryStatus: source.status,
    backlogState: backlog.state,
    outputFormat,
    converter,
    generatedBytes,
    targetPath: path.relative(frontendRoot, targetPath),
    existingAssets: existingAssets.map((filePath) => path.relative(frontendRoot, filePath)),
    writeRequested: write,
    overwriteRequested: overwrite,
    written: false,
  };

  if (write) {
    fs.mkdirSync(publicPartners, { recursive: true });
    if (overwrite) {
      for (const filePath of existingAssets) {
        if (filePath !== targetPath) fs.rmSync(filePath, { force: true });
      }
    }
    fs.copyFileSync(generatedPath, targetPath);
    payload.written = true;
  }

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, partnerId, source: sourceUrl, error: error?.message || String(error) }, null, 2));
  process.exitCode = 3;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
