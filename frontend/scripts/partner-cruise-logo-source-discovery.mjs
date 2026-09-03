const PARTNERS = Object.freeze([
  { id: "catlante-catamarans", name: "Catlante Catamarans", website: "https://www.catlante-catamarans.com/fr" },
  { id: "cfc", name: "CFC - Compagnie Française de Croisières", website: "https://www.cfc-croisieres.fr/" },
  { id: "croisieurope", name: "CroisiEurope", website: "https://www.croisieurope.com/" },
  { id: "explora-journeys", name: "Explora Journeys", website: "https://explorajourneys.com/fr/fr/" },
  { id: "hurtigruten", name: "Hurtigruten", website: "https://www.hurtigruten.com/fr-fr/" },
]);

const timeoutMs = 12000;
const maxCandidates = 16;

function unique(values) { return [...new Set(values.filter(Boolean))]; }
function decodeHtml(value) {
  return String(value || "")
    .replaceAll("&amp;", "&")
    .replaceAll("&#38;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}
function normalizedTokens(partner) {
  return unique([partner.id, partner.name]
    .flatMap((value) => value.toLowerCase().split(/[^a-z0-9]+/))
    .filter((token) => token.length >= 4 && !["compagnie", "francaise", "croisieres", "journeys", "catamarans"].includes(token)));
}
function assetScore(value, partner, context = "") {
  const lower = `${value} ${context}`.toLowerCase();
  let score = 0;
  if (/logo|wordmark|logotype/.test(lower)) score += 60;
  if (/brand|header|navbar|nav-logo|site-logo/.test(lower)) score += 18;
  if (/press|media|kit/.test(lower)) score += 10;
  for (const token of normalizedTokens(partner)) if (lower.includes(token)) score += 16;
  if (/\.svg(?:$|[?#])/.test(value.toLowerCase())) score += 16;
  if (/\.webp(?:$|[?#])/.test(value.toLowerCase())) score += 10;
  if (/\.png(?:$|[?#])/.test(value.toLowerCase())) score += 6;
  if (/favicon|icon|sprite|payment|social|flag|award|email|phone|quote|brochure/.test(lower)) score -= 55;
  return score;
}
function pushCandidate(raw, value, context = "") {
  if (!value) return;
  raw.push({ value: decodeHtml(value), context: decodeHtml(context) });
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
      const value = tag.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"))?.[1];
      pushCandidate(raw, value, context);
    }
    const srcset = tag.match(/srcset=["']([^"']+)["']/i)?.[1];
    if (srcset) for (const item of srcset.split(",")) pushCandidate(raw, item.trim().split(/\s+/)[0], context);
  }
  const cssUrlRegex = /url\((?:["']?)([^)"']+)(?:["']?)\)/gi;
  while ((match = cssUrlRegex.exec(html))) pushCandidate(raw, match[1], "css-url");
  const absoluteAssetRegex = /https?:\\?\/\\?\/[^\s"'<>]+?\.(?:svg|png|webp)(?:\?[^\s"'<>]*)?/gi;
  while ((match = absoluteAssetRegex.exec(html))) pushCandidate(raw, match[0].replaceAll("\\/", "/"), "embedded-asset-url");

  const deduped = new Map();
  for (const item of raw) {
    try {
      const url = new URL(item.value, baseUrl).href;
      if (!/\.(?:svg|png|webp)(?:$|[?#])/i.test(url)) continue;
      const score = assetScore(url, partner, item.context);
      if (score <= 0) continue;
      const existing = deduped.get(url);
      if (!existing || score > existing.score) deduped.set(url, { url, score, context: item.context.slice(0, 220) });
    } catch {}
  }
  return [...deduped.values()]
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, maxCandidates);
}
async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/1.1)", accept: "text/html,application/xhtml+xml" } });
    return { ok: response.ok, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type"), text: response.ok ? await response.text() : "" };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: null, text: "", error: error?.message || String(error) };
  } finally { clearTimeout(timer); }
}
async function probeAsset(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(decodeHtml(url), { method: "GET", redirect: "follow", signal: controller.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/1.1)", range: "bytes=0-2047" } });
    return { ok: response.ok || response.status === 206, status: response.status, finalUrl: response.url, contentType: response.headers.get("content-type"), contentLength: response.headers.get("content-length") };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: null, contentLength: null, error: error?.message || String(error) };
  } finally { clearTimeout(timer); }
}

const rows = [];
for (const partner of PARTNERS) {
  const page = await fetchText(partner.website);
  const candidates = page.ok ? extractCandidates(page.text, page.finalUrl, partner) : [];
  const probed = [];
  for (const candidate of candidates.slice(0, 8)) probed.push({ ...candidate, probe: await probeAsset(candidate.url) });
  rows.push({ ...partner, page: { ok: page.ok, status: page.status, finalUrl: page.finalUrl, contentType: page.contentType, error: page.error || null }, candidates: probed });
}
console.log(JSON.stringify({ policy: "discover-only-no-write", category: "croisieres", targetFormat: "individual-webp", partners: rows }, null, 2));
