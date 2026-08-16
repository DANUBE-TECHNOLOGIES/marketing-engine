import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const publicPartners = path.join(frontendRoot, "public", "partners");

const SOURCES = Object.freeze({
  "catlante-catamarans": {
    url: "https://www.catlante-catamarans.com/themes/custom/catlante/logo.svg",
    target: "catlante-catamarans.webp",
    width: 600,
    height: 240,
  },
});

const partnerArg = process.argv.find((arg) => arg.startsWith("--partner="));
const write = process.argv.includes("--write=true");
const partnerId = partnerArg?.split("=", 2)[1] || "";
const source = SOURCES[partnerId];

if (!source) {
  console.error(JSON.stringify({
    ok: false,
    error: "unsupported-partner",
    supported: Object.keys(SOURCES),
  }, null, 2));
  process.exit(2);
}

async function downloadSvg(url) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAcquisition/1.0)",
      accept: "image/svg+xml,image/*;q=0.9,*/*;q=0.1",
    },
  });
  if (!response.ok) throw new Error(`download failed: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const text = buffer.toString("utf8");
  if (!/<svg\b/i.test(text)) throw new Error("downloaded payload is not SVG");
  return { buffer, finalUrl: response.url, contentType: response.headers.get("content-type") };
}

function commandExists(command) {
  const probe = spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" });
  return probe.status === 0;
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
  }
  return result;
}

async function convertToWebp(svgPath, outputPath, width, height) {
  if (commandExists("magick")) {
    run("magick", [svgPath, "-background", "none", "-resize", `${width - 80}x${height - 60}>`, "-gravity", "center", "-extent", `${width}x${height}`, "-quality", "88", outputPath]);
    return "imagemagick-magick";
  }

  if (commandExists("convert")) {
    run("convert", [svgPath, "-background", "none", "-resize", `${width - 80}x${height - 60}>`, "-gravity", "center", "-extent", `${width}x${height}`, "-quality", "88", outputPath]);
    return "imagemagick-convert";
  }

  if (commandExists("rsvg-convert") && commandExists("cwebp")) {
    const pngPath = `${outputPath}.png`;
    run("rsvg-convert", ["-w", String(width - 80), "-h", String(height - 60), "-o", pngPath, svgPath]);
    run("cwebp", ["-quiet", "-q", "88", "-alpha_q", "100", pngPath, "-o", outputPath]);
    fs.rmSync(pngPath, { force: true });
    return "rsvg-cwebp";
  }

  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default || sharpModule;
    await sharp(svgPath)
      .resize(width - 80, height - 60, { fit: "inside", withoutEnlargement: true })
      .extend({
        top: 30,
        bottom: 30,
        left: 40,
        right: 40,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 88, alphaQuality: 100 })
      .toFile(outputPath);
    return "sharp";
  } catch {
    throw new Error("no SVG→WebP converter available (magick, convert, rsvg-convert+cwebp, or sharp)");
  }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mle-partner-logo-"));
const svgPath = path.join(tempDir, `${partnerId}.svg`);
const tempWebp = path.join(tempDir, source.target);
const targetPath = path.join(publicPartners, source.target);

try {
  const downloaded = await downloadSvg(source.url);
  fs.writeFileSync(svgPath, downloaded.buffer);
  const converter = await convertToWebp(svgPath, tempWebp, source.width, source.height);
  const stat = fs.statSync(tempWebp);
  if (!stat.size) throw new Error("generated WebP is empty");

  const payload = {
    ok: true,
    partnerId,
    source: downloaded.finalUrl,
    sourceContentType: downloaded.contentType,
    converter,
    generatedBytes: stat.size,
    dimensionsTarget: `${source.width}x${source.height}`,
    targetPath: path.relative(frontendRoot, targetPath),
    writeRequested: write,
    written: false,
  };

  if (write) {
    fs.mkdirSync(publicPartners, { recursive: true });
    fs.copyFileSync(tempWebp, targetPath);
    payload.written = true;
  }

  console.log(JSON.stringify(payload, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    ok: false,
    partnerId,
    source: source.url,
    error: error?.message || String(error),
  }, null, 2));
  process.exitCode = 3;
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
