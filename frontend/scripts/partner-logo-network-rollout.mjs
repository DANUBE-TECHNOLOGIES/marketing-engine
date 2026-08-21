import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");
const publicPartners = path.join(frontendRoot, "public/partners");
const cataloguePath = path.join(sharedRoot, "fullPartners.js");
const backlogPath = path.join(sharedRoot, "partnerLogoBacklog.js");
const provenancePath = path.join(sharedRoot, "partnerLogoResolvedSources.json");

const write = process.argv.includes("--write=true");
const minimumScoreArg = process.argv.find((arg) => arg.startsWith("--minimum-score="));
const minimumScore = Math.max(100, Number(minimumScoreArg?.split("=", 2)[1] || 108));
const timeoutMs = 12000;
const maxCandidates = 12;

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [catalogueModule, backlogModule, verificationModule, cruiseModule, circuitModule, stayModule, longHaulModule, franceEuropeModule] = await Promise.all([
  loadModule("fullPartners.js"),
  loadModule("partnerLogoBacklog.js"),
  loadModule("partnerVerification.js"),
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
const catalogue = Array.isArray(catalogueModule.FULL_PARTNERS) ? catalogueModule.FULL_PARTNERS : [];
const backlog = Array.isArray(backlogModule.PARTNER_LOGO_BACKLOG) ? backlogModule.PARTNER_LOGO_BACKLOG : [];
const backlogById = new Map(backlog.map((item) => [item.id, item]));
const getPartnerVerification = verificationModule.getPartnerVerification;

function commandExists(command) {
  return spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).status === 0;
}
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout || `exit ${result.status}`}`);
}
function unique(values) {
  return [...new Set(values.filter(Boolean))];
}
function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
function normalizedTokens(partner) {
  return unique([partner.id, partner.name]
    .flatMap((value) => String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 4 && !["voyages", "vacances", "tours", "travel", "club", "france", "europe", "compagnie"].includes(token)));
}
function assetScore(value, partner, context = "") {
  const lower = `${value} ${context}`.toLowerCase();
  let score = 0;
  if (/logo|wordmark|logotype/.test(lower)) score += 60;
  if (/brand|header|navbar|nav-logo|site-logo|logo-header/.test(lower)) score += 18;
  if (/press|media|kit/.test(lower)) score += 8;
  for (const token of normalizedTokens(partner)) if (lower.includes(token)) score += 16;
  if (/\.svg(?:$|[?#])/.test(value.toLowerCase())) score += 16;
  if (/\.webp(?:$|[?#])/.test(value.toLowerCase())) score += 10;
  if (/\.png(?:$|[?#])/.test(value.toLowerCase())) score += 6;
  if (/favicon|icon|sprite|payment|social|flag|award|email|phone|quote|brochure|footer-badge|app-store|play-store/.test(lower)) score -= 70;
  return score;
}
function pushCandidate(raw, value, context = "") {
  if (value) raw.push({ value: decodeHtml(value), context: decodeHtml(context) });
}
function extractCandidates(html, baseUrl, partner) {
  const raw = [];
  let match;
  const tagRegex = /<(?:img|source|link|meta)\b[^>]*>/gi;
  while ((match = tagRegex.exec(html))) {
    const tag = match[0];
    const context = [
      tag.match(/(?:alt|title|class|id|rel|property|name)=["']([^"']+)["']/i)?.[1],
      tag,
    ].filter(Boolean).join(" ");
    for (const attr of ["src", "href", "content", "data-src", "data-lazy-src"]) {
      pushCandidate(raw, tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1], context);
    }
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) for (const item of srcset.split(",")) pushCandidate(raw, item.trim().split(/\s+/)[0], context);
  }
  const cssUrlRegex = /url\((?:["']?)([^)"']+)(?:["']?)\)/gi;
  while ((match = cssUrlRegex.exec(html))) pushCandidate(raw, match[1], "css-url");

  const deduped = new Map();
  for (const item of raw) {
    try {
      const url = new URL(item.value, baseUrl).href;
      if (!/^https:/i.test(url)) continue;
      if (!/\.(?:svg|png|webp)(?:$|[?#])/i.test(url)) continue;
      const score = assetScore(url, partner, item.context);
      if (score <= 0) continue;
      const existing = deduped.get(url);
      if (!existing || score > existing.score) deduped.set(url, { url, score, context: item.context.slice(0, 260) });
    } catch {}
  }
  return [...deduped.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).slice(0, maxCandidates);
}
async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MondescaleNetworkLogoRollout/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || "",
      text: response.ok ? await response.text() : "",
    };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: "", text: "", error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}
async function downloadAsset(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MondescaleNetworkLogoRollout/1.0)",
        accept: "image/svg+xml,image/webp,image/png,image/*;q=0.9,*/*;q=0.1",
      },
    });
    if (!response.ok) throw new Error(`asset HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) throw new Error("asset-too-small");
    if (buffer.length > 2 * 1024 * 1024) throw new Error("asset-over-2MiB");
    return { buffer, finalUrl: response.url, contentType: response.headers.get("content-type") || "" };
  } finally {
    clearTimeout(timer);
  }
}
function detectFormat(buffer, contentType, url) {
  const head = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
  if (/image\/svg\+xml/i.test(contentType) || /<svg\b/i.test(head) || /\.svg(?:$|[?#])/i.test(url)) return "svg";
  if (/image\/webp/i.test(contentType) || buffer.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (/image\/png/i.test(contentType) || buffer.subarray(1, 4).toString("ascii") === "PNG") return "png";
  throw new Error(`unsupported-format:${contentType || "unknown"}`);
}
function validateSvg(buffer) {
  const text = buffer.toString("utf8");
  if (!/<svg\b/i.test(text)) throw new Error("invalid-svg-root");
  if (/<(?:script|iframe|object|embed)\b/i.test(text)) throw new Error("unsafe-svg-active-content");
  if (/\bon(?:load|error|click|mouseover|focus)\s*=/i.test(text)) throw new Error("unsafe-svg-event-handler");
  if (/\b(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|javascript:|data:text\/html)/i.test(text)) throw new Error("unsafe-svg-external-reference");
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
  if (inputFormat === "png" && commandExists("cwebp")) {
    run("cwebp", ["-quiet", "-q", "88", "-alpha_q", "100", inputPath, "-o", outputPath]);
    return "cwebp";
  }
  return null;
}
function strictCandidate(candidate, partner) {
  const lower = `${candidate.url} ${candidate.context}`.toLowerCase();
  const strongLogoSignal = /logo|wordmark|logotype|site-logo|nav-logo|logo-header/.test(lower);
  const tokenHits = normalizedTokens(partner).filter((token) => lower.includes(token)).length;
  return candidate.score >= minimumScore && strongLogoSignal && tokenHits > 0;
}
function sourcePageFor(source) {
  return String(source?.sourcePage || source?.sourceUrl || source?.preferredSource || "").trim();
}
function catalogueLineWithLogo(source, partnerId, publicUrl) {
  const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`^(\\s*)P\\("${escapedId}",([^\\n]*)\\),\\s*$`, "m");
  const match = source.match(linePattern);
  if (!match) throw new Error("catalogue-partner-line-not-found");
  const currentLine = match[0];
  const argsMatch = currentLine.match(/^(\s*)P\((.*)\),\s*$/);
  if (!argsMatch) throw new Error("catalogue-line-parse-failed");
  let args = argsMatch[2];
  if (/,[ ]*"\/partners\/[^"]+"[ ]*$/.test(args)) args = args.replace(/,[ ]*"\/partners\/[^"]+"[ ]*$/, `, "${publicUrl}"`);
  else args = `${args}, "${publicUrl}"`;
  return source.replace(linePattern, `${argsMatch[1]}P(${args}),`);
}
function backlogWithout(source, partnerId) {
  const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`^\\s*\\{\\s*id:\\s*"${escapedId}"[^\\n]*\\},\\s*\\n?`, "m");
  return source.replace(linePattern, "");
}
function loadProvenance() {
  if (!fs.existsSync(provenancePath)) return {};
  try { return JSON.parse(fs.readFileSync(provenancePath, "utf8")); } catch { return {}; }
}

const permissionBlocked = [];
const identityBlocked = [];
const alreadyReady = [];
const unresolved = [];
const resolved = [];

let catalogueSource = fs.readFileSync(cataloguePath, "utf8");
let backlogSource = fs.readFileSync(backlogPath, "utf8");
const provenance = loadProvenance();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mle-network-logos-"));

try {
  for (const partner of catalogue) {
    if (String(partner.logoUrl || "").trim()) {
      alreadyReady.push({ id: partner.id, logoUrl: partner.logoUrl });
      continue;
    }

    const verification = getPartnerVerification(partner.id);
    const backlogItem = backlogById.get(partner.id) || null;
    const source = registries[partner.category]?.[partner.id] || null;

    if (["identity-review", "catalogue-excluded"].includes(verification.status) || backlogItem?.state === "verification-pending") {
      identityBlocked.push({ id: partner.id, status: verification.status, backlogState: backlogItem?.state || null });
      continue;
    }
    if (verification.status === "asset-permission-review" || backlogItem?.state === "permission-required" || source?.status === "permission-review") {
      permissionBlocked.push({ id: partner.id, status: verification.status, sourceType: source?.sourceType || backlogItem?.sourceType || null });
      continue;
    }
    if (!source) {
      unresolved.push({ id: partner.id, reason: "missing-source-registry" });
      continue;
    }

    let selectedUrl = "";
    let selectionMode = "";
    let score = null;
    const directSource = String(source.preferredSource || source.assetUrl || "").trim();

    if (source.status === "vetted-source" && directSource) {
      selectedUrl = directSource;
      selectionMode = "pre-vetted";
    } else {
      const sourcePage = sourcePageFor(source);
      if (!sourcePage) {
        unresolved.push({ id: partner.id, reason: "missing-official-source-page" });
        continue;
      }
      const page = await fetchText(sourcePage);
      if (!page.ok) {
        unresolved.push({ id: partner.id, reason: "official-source-page-unreachable", status: page.status, sourcePage });
        continue;
      }
      const candidates = extractCandidates(page.text, page.finalUrl, partner);
      const strict = candidates.find((candidate) => strictCandidate(candidate, partner)) || null;
      if (!strict) {
        unresolved.push({ id: partner.id, reason: "no-high-confidence-masterbrand-candidate", sourcePage: page.finalUrl, bestScore: candidates[0]?.score || null, bestUrl: candidates[0]?.url || null });
        continue;
      }
      selectedUrl = strict.url;
      selectionMode = "official-page-high-confidence";
      score = strict.score;
    }

    const downloaded = await downloadAsset(selectedUrl);
    const inputFormat = detectFormat(downloaded.buffer, downloaded.contentType, downloaded.finalUrl);
    if (inputFormat === "svg") validateSvg(downloaded.buffer);

    const partnerTemp = path.join(tempRoot, partner.id);
    fs.mkdirSync(partnerTemp, { recursive: true });
    const inputPath = path.join(partnerTemp, `${partner.id}.${inputFormat}`);
    fs.writeFileSync(inputPath, downloaded.buffer);

    let outputFormat = inputFormat;
    let generatedPath = inputPath;
    let converter = "none-required";
    if (inputFormat === "png") {
      const outputPath = path.join(partnerTemp, `${partner.id}.webp`);
      const convertedBy = await convertToWebp(inputPath, outputPath, inputFormat);
      if (!convertedBy) {
        unresolved.push({ id: partner.id, reason: "png-needs-webp-converter", selectedUrl: downloaded.finalUrl });
        continue;
      }
      outputFormat = "webp";
      generatedPath = outputPath;
      converter = convertedBy;
    }
    if (!["svg", "webp"].includes(outputFormat)) {
      unresolved.push({ id: partner.id, reason: `unsupported-output-format:${outputFormat}` });
      continue;
    }

    const targetPath = path.join(publicPartners, `${partner.id}.${outputFormat}`);
    const publicUrl = `/partners/${partner.id}.${outputFormat}`;
    const assetBytes = fs.statSync(generatedPath).size;
    if (assetBytes < 100 || assetBytes > 2 * 1024 * 1024) {
      unresolved.push({ id: partner.id, reason: "generated-asset-size-invalid", assetBytes });
      continue;
    }

    if (write) {
      fs.mkdirSync(publicPartners, { recursive: true });
      for (const ext of ["svg", "webp"]) {
        const existing = path.join(publicPartners, `${partner.id}.${ext}`);
        if (existing !== targetPath && fs.existsSync(existing)) fs.rmSync(existing, { force: true });
      }
      fs.copyFileSync(generatedPath, targetPath);
      catalogueSource = catalogueLineWithLogo(catalogueSource, partner.id, publicUrl);
      backlogSource = backlogWithout(backlogSource, partner.id);
      provenance[partner.id] = {
        sourceUrl: downloaded.finalUrl,
        sourcePage: sourcePageFor(source) || null,
        sourceRegistryStatus: source.status || null,
        selectionMode,
        score,
        outputFormat,
        assetBytes,
        converter,
      };
    }

    resolved.push({ id: partner.id, category: partner.category, publicUrl, sourceUrl: downloaded.finalUrl, selectionMode, score, outputFormat, assetBytes, converter, written: write });
  }

  if (write) {
    fs.writeFileSync(cataloguePath, catalogueSource, "utf8");
    fs.writeFileSync(backlogPath, backlogSource, "utf8");
    fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  }
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

const summary = {
  mode: write ? "write" : "preview",
  minimumScore,
  cataloguePartners: catalogue.length,
  alreadyReady: alreadyReady.length,
  resolved: resolved.length,
  permissionBlocked: permissionBlocked.length,
  identityBlocked: identityBlocked.length,
  unresolved: unresolved.length,
  projectedReady: alreadyReady.length + resolved.length,
};

console.log(JSON.stringify({
  policy: "network-one-pass-official-source-high-confidence",
  summary,
  resolved,
  permissionBlocked,
  identityBlocked,
  unresolved,
}, null, 2));

if (write && resolved.length === 0 && unresolved.length > 0) process.exitCode = 4;
