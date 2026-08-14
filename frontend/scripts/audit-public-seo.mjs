const args = new Map(
  process.argv.slice(2).map((entry) => {
    const [key, ...rest] = entry.replace(/^--/, "").split("=");
    return [key, rest.join("=") || true];
  })
);

const origin = String(
  args.get("origin") ||
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
  "https://agences.mondescale.com"
).replace(/\/+$/, "");
const limit = Math.max(1, Number(args.get("limit") || 500));
const strict = args.get("strict") === true || args.get("strict") === "true";
const minimumWords = Math.max(40, Number(args.get("minimum-words") || 120));

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return decodeEntities(String(value || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, expression) {
  const match = String(html || "").match(expression);
  return match ? stripTags(match[1]) : "";
}

function allMatches(html, expression) {
  return [...String(html || "").matchAll(expression)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function metaContent(html, name, attribute = "name") {
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${name}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const value = firstMatch(html, pattern);
    if (value) return value;
  }

  return "";
}

function canonicalHref(html) {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const value = firstMatch(html, pattern);
    if (value) return value;
  }

  return "";
}

function sitemapUrls(xml) {
  return [...String(xml || "").matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeEntities(match[1]).trim())
    .filter((url) => url.startsWith(`${origin}/agence/`))
    .slice(0, limit);
}

function duplicateGroups(rows, key) {
  const groups = new Map();
  for (const row of rows) {
    const value = String(row[key] || "").trim().toLocaleLowerCase("fr-FR");
    if (!value) continue;
    if (!groups.has(value)) groups.set(value, []);
    groups.get(value).push(row.url);
  }
  return [...groups.entries()]
    .filter(([, urls]) => urls.length > 1)
    .map(([value, urls]) => ({ value, urls }));
}

function jsonLdDocuments(html) {
  const documents = [];
  const scripts = [...String(html || "").matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )];

  for (const match of scripts) {
    try {
      documents.push(JSON.parse(decodeEntities(match[1]).trim()));
    } catch {
      // Le document reste auditable même si un JSON-LD isolé est invalide.
    }
  }

  return documents;
}

function schemaNodes(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(schemaNodes);

  const nodes = [value];
  if (Array.isArray(value["@graph"])) {
    nodes.push(...value["@graph"].flatMap(schemaNodes));
  }
  return nodes;
}

function schemaOfType(documents, expected) {
  return documents
    .flatMap(schemaNodes)
    .find((node) => {
      const type = node?.["@type"];
      const values = Array.isArray(type) ? type : [type];
      return values.filter(Boolean).includes(expected);
    }) || null;
}

function hasSchemaType(documents, expected) {
  return Boolean(schemaOfType(documents, expected));
}

function siteSlugFromUrl(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[1] || "";
  } catch {
    return "";
  }
}

function pageKindFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean).slice(2);
    if (!parts.length) return "home";
    if (parts[0] === "destination") return "destination-detail";
    if (parts[0] === "inspiration" && parts.length > 1) return "inspiration-detail";
    return parts[0];
  } catch {
    return "unknown";
  }
}

function normalizeLocalText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function containsCity(value, city) {
  if (!city) return true;
  return normalizeLocalText(value).includes(normalizeLocalText(city));
}

function visibleMainText(html) {
  const source = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  const main = source.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || source;
  return stripTags(main);
}

function wordCount(value) {
  return String(value || "")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 1).length;
}

function agencyLocality(agency) {
  return String(
    agency?.address?.addressLocality ||
    agency?.addressLocality ||
    ""
  ).trim();
}

function agencyHasNap(agency) {
  return Boolean(
    agency &&
    agency.name &&
    agency.telephone &&
    agency?.address?.streetAddress &&
    agency?.address?.postalCode &&
    agency?.address?.addressLocality
  );
}

function localSignalRequired(kind) {
  return ![
    "destination-detail",
    "inspiration-detail",
    "mentions-legales",
    "confidentialite",
  ].includes(kind);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mondescale-SEO-Audit/3.0",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

const sitemap = await fetchText(`${origin}/sitemap.xml`);
const urls = sitemapUrls(sitemap);
const rows = [];
const errors = [];

for (const url of urls) {
  try {
    const html = await fetchText(url);
    const schemas = jsonLdDocuments(html);
    const h1s = allMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    const webPage = schemaOfType(schemas, "WebPage");
    const agency = schemaOfType(schemas, "TravelAgency");
    const text = visibleMainText(html);
    const row = {
      url,
      siteSlug: siteSlugFromUrl(url),
      pageKind: pageKindFromUrl(url),
      title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: metaContent(html, "description"),
      canonical: canonicalHref(html),
      h1: h1s[0] || "",
      h1Count: h1s.length,
      robots: metaContent(html, "robots"),
      ogTitle: metaContent(html, "og:title", "property"),
      ogDescription: metaContent(html, "og:description", "property"),
      ogImage: metaContent(html, "og:image", "property"),
      hasTravelAgency: Boolean(agency),
      hasWebPage: Boolean(webPage),
      hasBreadcrumb: hasSchemaType(schemas, "BreadcrumbList"),
      hasPrimaryImage: Boolean(webPage?.primaryImageOfPage?.url),
      city: agencyLocality(agency),
      hasNap: agencyHasNap(agency),
      wordCount: wordCount(text),
    };
    rows.push(row);
  } catch (error) {
    errors.push({ url, error: error.message });
  }
}

const critical = [];
const warnings = [];
for (const row of rows) {
  if (!row.title) critical.push(`${row.url}: title manquant`);
  if (!row.description) critical.push(`${row.url}: meta description manquante`);
  if (!row.canonical) critical.push(`${row.url}: canonical manquant`);
  if (row.canonical && row.canonical !== row.url) {
    critical.push(`${row.url}: canonical différent (${row.canonical})`);
  }
  if (!row.h1) critical.push(`${row.url}: H1 manquant`);
  if (row.h1Count > 1) warnings.push(`${row.url}: ${row.h1Count} H1 détectés`);
  if (/noindex/i.test(row.robots)) critical.push(`${row.url}: noindex présent dans le sitemap`);
  if (!row.hasTravelAgency) warnings.push(`${row.url}: JSON-LD TravelAgency absent`);
  if (row.hasTravelAgency && !row.hasNap) warnings.push(`${row.url}: NAP structuré incomplet`);
  if (!row.hasBreadcrumb) warnings.push(`${row.url}: JSON-LD BreadcrumbList absent`);
  if (!row.hasWebPage && !row.url.includes("/destination/")) {
    warnings.push(`${row.url}: JSON-LD WebPage absent`);
  }
  if (row.hasWebPage && !row.hasPrimaryImage) {
    warnings.push(`${row.url}: image principale WebPage absente`);
  }
  if (!row.ogTitle || !row.ogDescription) {
    warnings.push(`${row.url}: métadonnées Open Graph incomplètes`);
  }
  if (!row.ogImage) warnings.push(`${row.url}: og:image absent`);
  if (row.title.length > 65) warnings.push(`${row.url}: title long (${row.title.length})`);
  if (row.title && row.title.length < 25) warnings.push(`${row.url}: title court (${row.title.length})`);
  if (row.description.length > 165) warnings.push(`${row.url}: description longue (${row.description.length})`);
  if (row.description && row.description.length < 80) warnings.push(`${row.url}: description courte (${row.description.length})`);
  if (row.wordCount < minimumWords) warnings.push(`${row.url}: contenu visible léger (${row.wordCount} mots)`);

  if (row.city && localSignalRequired(row.pageKind)) {
    if (!containsCity(row.title, row.city)) warnings.push(`${row.url}: ville principale absente du title (${row.city})`);
    if (!containsCity(row.h1, row.city)) warnings.push(`${row.url}: ville principale absente du H1 (${row.city})`);
  }
}

for (const group of duplicateGroups(rows, "title")) {
  critical.push(`Title dupliqué sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}
for (const group of duplicateGroups(rows, "description")) {
  critical.push(`Description dupliquée sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}

const bySite = new Map();
for (const row of rows) {
  if (!bySite.has(row.siteSlug)) {
    bySite.set(row.siteSlug, { pages: 0, words: 0, thin: 0 });
  }
  const stats = bySite.get(row.siteSlug);
  stats.pages += 1;
  stats.words += row.wordCount;
  if (row.wordCount < minimumWords) stats.thin += 1;
}

console.log(`SEO audit public: ${rows.length}/${urls.length} pages analysées.`);
console.log(`Origine: ${origin}`);
console.log(`Mini-sites détectés: ${bySite.size}`);
console.log(`Seuil contenu léger: ${minimumWords} mots`);
console.log(`Erreurs HTTP: ${errors.length}`);
console.log(`Problèmes critiques: ${critical.length}`);
console.log(`Avertissements: ${warnings.length}`);

if (bySite.size) {
  console.log("\nCOUVERTURE PAR MINI-SITE");
  for (const [siteSlug, stats] of [...bySite.entries()].sort()) {
    const average = stats.pages ? Math.round(stats.words / stats.pages) : 0;
    console.log(`- ${siteSlug}: ${stats.pages} URL(s), ${average} mots/page en moyenne, ${stats.thin} page(s) légères`);
  }
}

const thinPages = rows
  .filter((row) => row.wordCount < minimumWords)
  .sort((a, b) => a.wordCount - b.wordCount);
if (thinPages.length) {
  console.log("\nPAGES A ENRICHIR EN PRIORITE");
  for (const row of thinPages.slice(0, 30)) {
    console.log(`- ${row.wordCount} mots · ${row.url}`);
  }
}

if (errors.length) {
  console.log("\nERREURS HTTP");
  for (const item of errors) console.log(`- ${item.url}: ${item.error}`);
}

if (critical.length) {
  console.log("\nPROBLEMES CRITIQUES");
  for (const issue of critical) console.log(`- ${issue}`);
}

if (warnings.length) {
  console.log("\nAVERTISSEMENTS");
  for (const warning of warnings) console.log(`- ${warning}`);
}

if (!errors.length && !critical.length && !warnings.length) {
  console.log("\nOK: aucun problème SEO structurel détecté sur les URLs du sitemap.");
}

if (strict && (errors.length || critical.length)) {
  process.exitCode = 1;
}
