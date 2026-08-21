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
const timeoutMs = 12000;
const maxSecondaryPages = 4;
const maxStylesheets = 5;
const minimumScore = 84;

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [catalogueModule, backlogModule, verificationModule, cruiseModule, circuitModule, stayModule, longHaulModule, franceEuropeModule] = await Promise.all([
  loadModule("fullPartners.js"), loadModule("partnerLogoBacklog.js"), loadModule("partnerVerification.js"),
  loadModule("partnerCruiseLogoSources.js"), loadModule("partnerCircuitLogoSources.js"), loadModule("partnerStayLogoSources.js"),
  loadModule("partnerLongHaulLogoSources.js"), loadModule("partnerFranceEuropeLogoSources.js"),
]);

const catalogue = Array.isArray(catalogueModule.FULL_PARTNERS) ? catalogueModule.FULL_PARTNERS : [];
const backlog = Array.isArray(backlogModule.PARTNER_LOGO_BACKLOG) ? backlogModule.PARTNER_LOGO_BACKLOG : [];
const backlogById = new Map(backlog.map((item) => [item.id, item]));
const getPartnerVerification = verificationModule.getPartnerVerification;
const registries = Object.freeze({
  croisieres: cruiseModule.PARTNER_CRUISE_LOGO_SOURCES || {},
  circuits: circuitModule.PARTNER_CIRCUIT_LOGO_SOURCES || {},
  sejours: stayModule.PARTNER_STAY_LOGO_SOURCES || {},
  "sur-mesure": longHaulModule.PARTNER_LONG_HAUL_LOGO_SOURCES || {},
  "france-europe": franceEuropeModule.PARTNER_FRANCE_EUROPE_LOGO_SOURCES || {},
});

function commandExists(command) { return spawnSync("sh", ["-c", `command -v ${command}`], { encoding: "utf8" }).status === 0; }
function run(command, args) { const result = spawnSync(command, args, { encoding: "utf8" }); if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout || result.status}`); }
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function tokens(partner) {
  return unique([partner.id, partner.name].flatMap((value) => normalize(value).split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 4 && !["voyages", "vacances", "tours", "travel", "club", "france", "europe", "compagnie"].includes(token)));
}
function decodeHtml(value) { return String(value || "").replaceAll("&amp;", "&").replaceAll("&#38;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'"); }
function safeUrl(value, baseUrl) { try { const url = new URL(decodeHtml(value), baseUrl); return /^https:/i.test(url.href) ? url.href : ""; } catch { return ""; } }
function sameSite(a, b) { try { const aa = new URL(a); const bb = new URL(b); return aa.hostname.replace(/^www\./, "") === bb.hostname.replace(/^www\./, ""); } catch { return false; } }

async function fetchText(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerLogoDeep/1.0)", accept: "text/html,text/css,application/xhtml+xml,*/*;q=0.2" } });
    return { ok: response.ok, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type") || "", text: response.ok ? await response.text() : "" };
  } catch (error) { return { ok: false, status: 0, finalUrl: url, contentType: "", text: "", error: error?.message || String(error) }; }
  finally { clearTimeout(timer); }
}

async function downloadAsset(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerLogoDeep/1.0)", accept: "image/svg+xml,image/webp,image/png,image/*;q=0.9,*/*;q=0.1" } });
    if (!response.ok) throw new Error(`asset-http-${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100 || buffer.length > 2 * 1024 * 1024) throw new Error("asset-size-invalid");
    return { buffer, finalUrl: response.url, contentType: response.headers.get("content-type") || "" };
  } finally { clearTimeout(timer); }
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
async function convertToWebp(inputPath, outputPath) {
  if (commandExists("magick")) { run("magick", [inputPath, "-background", "none", "-resize", "520x180>", "-gravity", "center", "-extent", "600x240", "-quality", "88", outputPath]); return "imagemagick-magick"; }
  if (commandExists("convert")) { run("convert", [inputPath, "-background", "none", "-resize", "520x180>", "-gravity", "center", "-extent", "600x240", "-quality", "88", outputPath]); return "imagemagick-convert"; }
  if (commandExists("cwebp")) { run("cwebp", ["-quiet", "-q", "88", "-alpha_q", "100", inputPath, "-o", outputPath]); return "cwebp"; }
  return null;
}

function addCandidate(map, rawUrl, baseUrl, partner, context, semantic = "generic") {
  const url = safeUrl(rawUrl, baseUrl); if (!url || !/\.(?:svg|png|webp)(?:$|[?#])/i.test(url)) return;
  const lower = normalize(`${url} ${context}`); const brandHits = tokens(partner).filter((token) => lower.includes(token)).length;
  let score = 0;
  if (semantic === "structured-logo") score += 120;
  if (semantic === "itemprop-logo") score += 110;
  if (/logo|wordmark|logotype/.test(lower)) score += 58;
  if (/header|navbar|nav-logo|site-logo|logo-header|brand/.test(lower)) score += 20;
  if (/press|media|kit/.test(lower)) score += 10;
  score += brandHits * 20;
  if (/\.svg(?:$|[?#])/i.test(url)) score += 16; else if (/\.webp(?:$|[?#])/i.test(url)) score += 10; else score += 6;
  if (/favicon|sprite|payment|social|flag|award|email|phone|brochure|footer-badge|app-store|play-store|icon[-_.]/.test(lower)) score -= 90;
  const explicit = semantic === "structured-logo" || semantic === "itemprop-logo";
  const strongSignal = /logo|wordmark|logotype|site-logo|nav-logo|logo-header/.test(lower);
  if (!explicit && !(strongSignal && brandHits > 0 && score >= minimumScore)) return;
  const existing = map.get(url); const candidate = { url, score, context: String(context || "").slice(0, 260), semantic, brandHits };
  if (!existing || candidate.score > existing.score) map.set(url, candidate);
}

function extractPageCandidates(html, baseUrl, partner, map) {
  let match;
  const tagRegex = /<(?:img|source|meta|link)\b[^>]*>/gi;
  while ((match = tagRegex.exec(html))) {
    const tag = match[0]; const itempropLogo = /itemprop=["']logo["']/i.test(tag); const context = tag;
    for (const attr of ["src", "href", "content", "data-src", "data-lazy-src"]) {
      const value = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1];
      if (value) addCandidate(map, value, baseUrl, partner, context, itempropLogo ? "itemprop-logo" : "generic");
    }
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) for (const item of srcset.split(",")) addCandidate(map, item.trim().split(/\s+/)[0], baseUrl, partner, context, itempropLogo ? "itemprop-logo" : "generic");
  }

  const scripts = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const script of scripts) {
    const text = script[1];
    for (const logoMatch of text.matchAll(/["']logo["']\s*:\s*["']([^"']+)["']/gi)) addCandidate(map, logoMatch[1], baseUrl, partner, text.slice(Math.max(0, logoMatch.index - 120), logoMatch.index + 220), "structured-logo");
    for (const logoMatch of text.matchAll(/["']logo["']\s*:\s*\{[\s\S]{0,300}?["'](?:url|contentUrl|@id)["']\s*:\s*["']([^"']+)["']/gi)) addCandidate(map, logoMatch[1], baseUrl, partner, logoMatch[0], "structured-logo");
  }
}

function extractSecondaryLinks(html, baseUrl) {
  const out = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = safeUrl(match[1], baseUrl); if (!url || !sameSite(url, baseUrl)) continue;
    const label = normalize(`${match[1]} ${match[2].replace(/<[^>]+>/g, " ")}`);
    if (/press|presse|media|brand|marque|logo|kit|professionnel|pro-espace|qui-sommes|about|corporate/.test(label)) out.push(url);
  }
  return unique(out).slice(0, maxSecondaryPages);
}
function extractStylesheets(html, baseUrl) {
  const out = [];
  for (const match of html.matchAll(/<link\b[^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const url = safeUrl(match[1], baseUrl); if (url && sameSite(url, baseUrl)) out.push(url);
  }
  for (const match of html.matchAll(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["'][^"']*stylesheet[^"']*["'][^>]*>/gi)) {
    const url = safeUrl(match[1], baseUrl); if (url && sameSite(url, baseUrl)) out.push(url);
  }
  return unique(out).slice(0, maxStylesheets);
}
function extractCssCandidates(css, baseUrl, partner, map) {
  for (const match of css.matchAll(/url\((?:["']?)([^)"']+)(?:["']?)\)/gi)) {
    const start = Math.max(0, match.index - 180); const context = css.slice(start, match.index + 180);
    if (/logo|brand|header|navbar|nav/i.test(context)) addCandidate(map, match[1], baseUrl, partner, context, "generic");
  }
}

function catalogueLineWithLogo(source, partnerId, publicUrl) {
  const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const linePattern = new RegExp(`^(\\s*)P\\("${escapedId}",([^\\n]*)\\),\\s*$`, "m");
  const match = source.match(linePattern); if (!match) throw new Error(`catalogue-partner-line-not-found:${partnerId}`);
  const argsMatch = match[0].match(/^(\s*)P\((.*)\),\s*$/); let args = argsMatch[2];
  if (/,[ ]*"\/partners\/[^"]+"[ ]*$/.test(args)) args = args.replace(/,[ ]*"\/partners\/[^"]+"[ ]*$/, `, "${publicUrl}"`); else args = `${args}, "${publicUrl}"`;
  return source.replace(linePattern, `${argsMatch[1]}P(${args}),`);
}
function backlogWithout(source, partnerId) {
  const escapedId = partnerId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.replace(new RegExp(`^\\s*\\{\\s*id:\\s*"${escapedId}"[^\\n]*\\},\\s*\\n?`, "m"), "");
}
function loadProvenance() { try { return JSON.parse(fs.readFileSync(provenancePath, "utf8")); } catch { return {}; } }

let catalogueSource = fs.readFileSync(cataloguePath, "utf8");
let backlogSource = fs.readFileSync(backlogPath, "utf8");
const provenance = loadProvenance();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mle-deep-logos-"));
const resolved = [], unresolved = [], permissionBlocked = [], identityBlocked = [], alreadyReady = [];

try {
  for (const partner of catalogue) {
    if (String(partner.logoUrl || "").trim()) { alreadyReady.push({ id: partner.id, logoUrl: partner.logoUrl }); continue; }
    const verification = getPartnerVerification(partner.id); const backlogItem = backlogById.get(partner.id) || null; const source = registries[partner.category]?.[partner.id] || null;
    if (["identity-review", "catalogue-excluded"].includes(verification.status) || backlogItem?.state === "verification-pending") { identityBlocked.push({ id: partner.id, status: verification.status }); continue; }
    if (verification.status === "asset-permission-review" || backlogItem?.state === "permission-required" || source?.status === "permission-review") { permissionBlocked.push({ id: partner.id, status: verification.status }); continue; }
    const sourcePage = String(source?.sourcePage || source?.sourceUrl || source?.preferredSource || "").trim();
    if (!sourcePage) { unresolved.push({ id: partner.id, reason: "missing-official-source-page" }); continue; }

    const candidates = new Map(); const crawledPages = [];
    const first = await fetchText(sourcePage);
    if (!first.ok) { unresolved.push({ id: partner.id, reason: "official-source-page-unreachable", status: first.status, sourcePage }); continue; }
    const pages = [first.finalUrl, ...extractSecondaryLinks(first.text, first.finalUrl)];
    const visited = new Set();
    for (const pageUrl of pages) {
      if (visited.has(pageUrl)) continue; visited.add(pageUrl);
      const page = pageUrl === first.finalUrl ? first : await fetchText(pageUrl); if (!page.ok) continue;
      crawledPages.push(page.finalUrl); extractPageCandidates(page.text, page.finalUrl, partner, candidates);
      for (const stylesheet of extractStylesheets(page.text, page.finalUrl)) {
        const css = await fetchText(stylesheet); if (css.ok) extractCssCandidates(css.text, css.finalUrl, partner, candidates);
      }
    }

    const ranked = [...candidates.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url));
    const selected = ranked[0] || null;
    if (!selected) { unresolved.push({ id: partner.id, reason: "no-deep-official-logo-candidate", crawledPages }); continue; }

    let downloaded;
    try { downloaded = await downloadAsset(selected.url); } catch (error) { unresolved.push({ id: partner.id, reason: "asset-download-failed", candidate: selected.url, error: error?.message || String(error) }); continue; }
    let inputFormat;
    try { inputFormat = detectFormat(downloaded.buffer, downloaded.contentType, downloaded.finalUrl); if (inputFormat === "svg") validateSvg(downloaded.buffer); }
    catch (error) { unresolved.push({ id: partner.id, reason: "asset-validation-failed", candidate: selected.url, error: error?.message || String(error) }); continue; }

    const partnerTemp = path.join(tempRoot, partner.id); fs.mkdirSync(partnerTemp, { recursive: true });
    const inputPath = path.join(partnerTemp, `${partner.id}.${inputFormat}`); fs.writeFileSync(inputPath, downloaded.buffer);
    let outputFormat = inputFormat, generatedPath = inputPath, converter = "none-required";
    if (inputFormat === "png") {
      const outputPath = path.join(partnerTemp, `${partner.id}.webp`); const convertedBy = await convertToWebp(inputPath, outputPath);
      if (!convertedBy) { unresolved.push({ id: partner.id, reason: "png-needs-webp-converter" }); continue; }
      outputFormat = "webp"; generatedPath = outputPath; converter = convertedBy;
    }
    if (!["svg", "webp"].includes(outputFormat)) { unresolved.push({ id: partner.id, reason: `unsupported-output-format:${outputFormat}` }); continue; }

    const publicUrl = `/partners/${partner.id}.${outputFormat}`; const targetPath = path.join(publicPartners, `${partner.id}.${outputFormat}`); const assetBytes = fs.statSync(generatedPath).size;
    if (write) {
      fs.mkdirSync(publicPartners, { recursive: true }); fs.copyFileSync(generatedPath, targetPath);
      catalogueSource = catalogueLineWithLogo(catalogueSource, partner.id, publicUrl); backlogSource = backlogWithout(backlogSource, partner.id);
      provenance[partner.id] = { sourceUrl: downloaded.finalUrl, sourcePage, selectionMode: `deep-${selected.semantic}`, score: selected.score, brandHits: selected.brandHits, crawledPages, outputFormat, assetBytes, converter };
    }
    resolved.push({ id: partner.id, publicUrl, sourceUrl: downloaded.finalUrl, semantic: selected.semantic, score: selected.score, brandHits: selected.brandHits, crawledPages, written: write });
  }

  if (write) {
    fs.writeFileSync(cataloguePath, catalogueSource, "utf8"); fs.writeFileSync(backlogPath, backlogSource, "utf8"); fs.writeFileSync(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  }
} finally { fs.rmSync(tempRoot, { recursive: true, force: true }); }

const summary = { mode: write ? "write" : "preview", cataloguePartners: catalogue.length, alreadyReady: alreadyReady.length, resolved: resolved.length, permissionBlocked: permissionBlocked.length, identityBlocked: identityBlocked.length, unresolved: unresolved.length, projectedReady: alreadyReady.length + resolved.length };
console.log(JSON.stringify({ policy: "network-deep-official-source-crawl", summary, resolved, permissionBlocked, identityBlocked, unresolved }, null, 2));
