import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const sharedRoot = path.join(frontendRoot, "components/page-builder/shared");

const timeoutMs = 12000;
const maxCandidates = 12;
const categoryArg = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1] || "";
const partnerArg = process.argv.find((arg) => arg.startsWith("--partner="))?.split("=")[1] || "";

async function loadModule(fileName) {
  const source = fs.readFileSync(path.join(sharedRoot, fileName), "utf8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  return import(dataUrl);
}

const [catalogueModule, verificationModule, cruiseModule, circuitModule, stayModule, longHaulModule, franceEuropeModule] = await Promise.all([
  loadModule("fullPartners.js"), loadModule("partnerVerification.js"), loadModule("partnerCruiseLogoSources.js"),
  loadModule("partnerCircuitLogoSources.js"), loadModule("partnerStayLogoSources.js"), loadModule("partnerLongHaulLogoSources.js"),
  loadModule("partnerFranceEuropeLogoSources.js"),
]);
const catalogue = Array.isArray(catalogueModule.FULL_PARTNERS) ? catalogueModule.FULL_PARTNERS : [];
const getPartnerVerification = verificationModule.getPartnerVerification;
const registries = new Map([
  ["croisieres", cruiseModule.PARTNER_CRUISE_LOGO_SOURCES || {}], ["circuits", circuitModule.PARTNER_CIRCUIT_LOGO_SOURCES || {}],
  ["sejours", stayModule.PARTNER_STAY_LOGO_SOURCES || {}], ["sur-mesure", longHaulModule.PARTNER_LONG_HAUL_LOGO_SOURCES || {}],
  ["france-europe", franceEuropeModule.PARTNER_FRANCE_EUROPE_LOGO_SOURCES || {}],
]);

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function decodeHtml(value) { return String(value || "").replaceAll("&amp;", "&").replaceAll("&#38;", "&").replaceAll("&quot;", '"').replaceAll("&#39;", "'"); }
function normalizedTokens(partner) {
  return unique([partner.id, partner.name].flatMap((value) => value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 4 && !["voyages", "vacances", "tours", "travel", "club", "france", "europe"].includes(token)));
}
function assetScore(value, partner, context = "") {
  const lower = `${value} ${context}`.toLowerCase(); let score = 0;
  if (/logo|wordmark|logotype/.test(lower)) score += 60;
  if (/brand|header|navbar|nav-logo|site-logo|logo-header/.test(lower)) score += 18;
  if (/press|media|kit/.test(lower)) score += 8;
  for (const token of normalizedTokens(partner)) if (lower.includes(token)) score += 16;
  if (/\.svg(?:$|[?#])/.test(value.toLowerCase())) score += 16;
  if (/\.webp(?:$|[?#])/.test(value.toLowerCase())) score += 10;
  if (/\.png(?:$|[?#])/.test(value.toLowerCase())) score += 6;
  if (/favicon|icon|sprite|payment|social|flag|award|email|phone|quote|brochure|footer-badge/.test(lower)) score -= 55;
  return score;
}
function pushCandidate(raw, value, context = "") { if (value) raw.push({ value: decodeHtml(value), context: decodeHtml(context) }); }
function extractCandidates(html, baseUrl, partner) {
  const raw = []; let match; const tagRegex = /<(?:img|source|link|meta)\b[^>]*>/gi;
  while ((match = tagRegex.exec(html))) {
    const tag = match[0]; const context = [tag.match(/(?:alt|title|class|id|rel|property|name)=["']([^"']+)["']/i)?.[1], tag].filter(Boolean).join(" ");
    for (const attr of ["src", "href", "content", "data-src", "data-lazy-src"]) pushCandidate(raw, tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1], context);
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1]; if (srcset) for (const item of srcset.split(",")) pushCandidate(raw, item.trim().split(/\s+/)[0], context);
  }
  const cssUrlRegex = /url\((?:["']?)([^)"']+)(?:["']?)\)/gi; while ((match = cssUrlRegex.exec(html))) pushCandidate(raw, match[1], "css-url");
  const absoluteAssetRegex = /https?:\\?\/\\?\/[^\s"'<>]+?\.(?:svg|png|webp)(?:\?[^\s"'<>]*)?/gi;
  while ((match = absoluteAssetRegex.exec(html))) pushCandidate(raw, match[0].replaceAll("\\/", "/"), "embedded-asset-url");
  const deduped = new Map();
  for (const item of raw) try {
    const url = new URL(item.value, baseUrl).href; if (!/\.(?:svg|png|webp)(?:$|[?#])/i.test(url)) continue;
    const score = assetScore(url, partner, item.context); if (score <= 0) continue;
    const existing = deduped.get(url); if (!existing || score > existing.score) deduped.set(url, { url, score, context: item.context.slice(0, 220) });
  } catch {}
  return [...deduped.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).slice(0, maxCandidates);
}
async function fetchText(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/2.1)", accept: "text/html,application/xhtml+xml" } });
    return { ok: response.ok, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type"), text: response.ok ? await response.text() : "" };
  } catch (error) { return { ok: false, status: 0, finalUrl: url, contentType: null, text: "", error: error?.message || String(error) }; } finally { clearTimeout(timer); }
}
async function probeAsset(url) {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { const response = await fetch(decodeHtml(url), { method: "GET", redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/2.1)", range: "bytes=0-2047" } });
    return { ok: response.ok || response.status === 206, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length") };
  } catch (error) { return { ok: false, status: 0, finalUrl: url, contentType: null, contentLength: null, error: error?.message || String(error) }; } finally { clearTimeout(timer); }
}
function candidateDecision(candidate, partner) {
  if (!candidate.probe?.ok) return { state: "unreachable", reason: "asset probe failed" };
  const type = String(candidate.probe.contentType || "").toLowerCase();
  if (type && !/^image\/(?:svg\+xml|webp|png)(?:;|$)/.test(type)) return { state: "reject", reason: `unexpected content-type ${type}` };
  const lower = `${candidate.url} ${candidate.context}`.toLowerCase();
  if (/favicon|sprite|social|payment|footer-badge|icon[-_.]/.test(lower)) return { state: "reject", reason: "non-masterbrand asset signals" };
  const tokenHits = normalizedTokens(partner).filter((token) => lower.includes(token)).length;
  const strongLogoSignal = /logo|wordmark|logotype|site-logo|nav-logo|logo-header/.test(lower);
  if (candidate.score >= 90 && strongLogoSignal && tokenHits > 0) return { state: "review-first", reason: "strong masterbrand candidate; visual/legal review still required" };
  if (candidate.score >= 70 && strongLogoSignal) return { state: "review", reason: "probable logo candidate; manual masterbrand confirmation required" };
  return { state: "weak", reason: "insufficient masterbrand confidence" };
}

const selected = catalogue.filter((partner) => {
  if (categoryArg && partner.category !== categoryArg) return false; if (partnerArg && partner.id !== partnerArg) return false;
  const verification = getPartnerVerification(partner.id);
  if (["identity-review", "catalogue-excluded", "asset-permission-review"].includes(verification.status)) return false;
  if (String(partner.logoUrl || "").trim()) return false;
  const source = registries.get(partner.category)?.[partner.id] || null; if (!source) return false;
  return source.status !== "permission-review" && source.status !== "vetted-source";
});
const rows = [];
for (const partner of selected) {
  const source = registries.get(partner.category)?.[partner.id] || null; const sourcePage = source?.sourcePage || source?.sourceUrl || source?.preferredSource || "";
  if (!sourcePage) { rows.push({ id: partner.id, name: partner.name, category: partner.category, sourceStatus: source?.status || null, page: { ok: false, error: "missing source page" }, candidates: [], nextAction: "fix-source-page" }); continue; }
  const page = await fetchText(sourcePage); const candidates = page.ok ? extractCandidates(page.text, page.finalUrl, partner) : []; const probed = [];
  for (const candidate of candidates.slice(0, 8)) { const row = { ...candidate, probe: await probeAsset(candidate.url) }; probed.push({ ...row, decision: candidateDecision(row, partner) }); }
  const firstReviewable = probed.find((candidate) => candidate.decision.state === "review-first") || probed.find((candidate) => candidate.decision.state === "review") || null;
  rows.push({ id: partner.id, name: partner.name, category: partner.category, sourceStatus: source.status || null, sourcePage,
    page: { ok: page.ok, status: page.status, finalUrl: page.finalUrl, contentType: page.contentType, error: page.error || null }, candidates: probed,
    suggestedCandidate: firstReviewable ? { url: firstReviewable.url, score: firstReviewable.score, decision: firstReviewable.decision } : null,
    nextAction: firstReviewable ? "manual-masterbrand-review" : page.ok ? "broaden-official-source-search" : "repair-official-source-page",
  });
}
const summary = { selected: rows.length, withSuggestedCandidate: rows.filter((row) => row.suggestedCandidate).length,
  needsBroaderSearch: rows.filter((row) => row.nextAction === "broaden-official-source-search").length,
  brokenSourcePage: rows.filter((row) => row.nextAction === "repair-official-source-page" || row.nextAction === "fix-source-page").length };
console.log(JSON.stringify({ policy: "discover-classify-no-write", filters: { category: categoryArg || null, partner: partnerArg || null }, summary,
  acceptedAssetFormats: ["svg", "webp", "png"], partners: rows }, null, 2));
