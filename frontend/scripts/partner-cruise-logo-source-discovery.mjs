const PARTNERS = Object.freeze([
  { id: "catlante-catamarans", name: "Catlante Catamarans", website: "https://www.catlante-catamarans.com/fr" },
  { id: "cfc", name: "CFC - Compagnie Française de Croisières", website: "https://www.cfc-croisieres.fr/" },
  { id: "croisieurope", name: "CroisiEurope", website: "https://www.croisieurope.com/" },
  { id: "explora-journeys", name: "Explora Journeys", website: "https://explorajourneys.com/fr/fr/" },
  { id: "hurtigruten", name: "Hurtigruten", website: "https://www.hurtigruten.com/fr-fr/" },
]);

const timeoutMs = 12000;
const maxCandidates = 12;

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function assetScore(value, partner) {
  const lower = value.toLowerCase();
  let score = 0;
  if (lower.includes("logo")) score += 50;
  if (lower.includes(partner.id.replaceAll("-", ""))) score += 20;
  for (const token of partner.name.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length >= 4)) {
    if (lower.includes(token)) score += 8;
  }
  if (/\.svg(?:$|[?#])/.test(lower)) score += 12;
  if (/\.webp(?:$|[?#])/.test(lower)) score += 10;
  if (/\.png(?:$|[?#])/.test(lower)) score += 6;
  if (/footer|header|brand|navbar|nav-logo/.test(lower)) score += 4;
  if (/favicon|icon|sprite|payment|social|flag/.test(lower)) score -= 35;
  return score;
}

function extractCandidates(html, baseUrl, partner) {
  const raw = [];
  const attributeRegex = /(?:src|href|content|data-src|data-lazy-src)=["']([^"']+)["']/gi;
  let match;
  while ((match = attributeRegex.exec(html))) raw.push(match[1]);

  const cssUrlRegex = /url\((?:["']?)([^)"']+)(?:["']?)\)/gi;
  while ((match = cssUrlRegex.exec(html))) raw.push(match[1]);

  return unique(raw)
    .map((value) => {
      try { return new URL(value, baseUrl).href; } catch { return null; }
    })
    .filter((value) => value && /\.(?:svg|png|webp)(?:$|[?#])/i.test(value))
    .map((url) => ({ url, score: assetScore(url, partner) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, maxCandidates);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/1.0)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      text: response.ok ? await response.text() : "",
    };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: null, text: "", error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function probeAsset(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; MondescalePartnerAssetAudit/1.0)",
        range: "bytes=0-1023",
      },
    });
    return {
      ok: response.ok || response.status === 206,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
    };
  } catch (error) {
    return { ok: false, status: 0, finalUrl: url, contentType: null, contentLength: null, error: error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

const rows = [];
for (const partner of PARTNERS) {
  const page = await fetchText(partner.website);
  const candidates = page.ok ? extractCandidates(page.text, page.finalUrl, partner) : [];
  const probed = [];
  for (const candidate of candidates.slice(0, 6)) {
    probed.push({ ...candidate, probe: await probeAsset(candidate.url) });
  }
  rows.push({
    ...partner,
    page: {
      ok: page.ok,
      status: page.status,
      finalUrl: page.finalUrl,
      contentType: page.contentType,
      error: page.error || null,
    },
    candidates: probed,
  });
}

console.log(JSON.stringify({
  policy: "discover-only-no-write",
  category: "croisieres",
  targetFormat: "individual-webp",
  partners: rows,
}, null, 2));
