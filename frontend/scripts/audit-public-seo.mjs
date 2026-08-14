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

function hasSchemaType(documents, expected) {
  return documents
    .flatMap(schemaNodes)
    .some((node) => {
      const type = node?.["@type"];
      const values = Array.isArray(type) ? type : [type];
      return values.filter(Boolean).includes(expected);
    });
}

function webPageSchema(documents) {
  return documents
    .flatMap(schemaNodes)
    .find((node) => {
      const type = node?.["@type"];
      const values = Array.isArray(type) ? type : [type];
      return values.includes("WebPage");
    }) || null;
}

function siteSlugFromUrl(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[1] || "";
  } catch {
    return "";
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mondescale-SEO-Audit/2.0",
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
    const webPage = webPageSchema(schemas);
    const row = {
      url,
      siteSlug: siteSlugFromUrl(url),
      title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: metaContent(html, "description"),
      canonical: canonicalHref(html),
      h1: h1s[0] || "",
      h1Count: h1s.length,
      robots: metaContent(html, "robots"),
      ogTitle: metaContent(html, "og:title", "property"),
      ogDescription: metaContent(html, "og:description", "property"),
      ogImage: metaContent(html, "og:image", "property"),
      hasTravelAgency: hasSchemaType(schemas, "TravelAgency"),
      hasWebPage: Boolean(webPage),
      hasBreadcrumb: hasSchemaType(schemas, "BreadcrumbList"),
      hasPrimaryImage: Boolean(webPage?.primaryImageOfPage?.url),
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
}

for (const group of duplicateGroups(rows, "title")) {
  critical.push(`Title dupliqué sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}
for (const group of duplicateGroups(rows, "description")) {
  critical.push(`Description dupliquée sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}

const bySite = new Map();
for (const row of rows) {
  if (!bySite.has(row.siteSlug)) bySite.set(row.siteSlug, 0);
  bySite.set(row.siteSlug, bySite.get(row.siteSlug) + 1);
}

console.log(`SEO audit public: ${rows.length}/${urls.length} pages analysées.`);
console.log(`Origine: ${origin}`);
console.log(`Mini-sites détectés: ${bySite.size}`);
console.log(`Erreurs HTTP: ${errors.length}`);
console.log(`Problèmes critiques: ${critical.length}`);
console.log(`Avertissements: ${warnings.length}`);

if (bySite.size) {
  console.log("\nCOUVERTURE PAR MINI-SITE");
  for (const [siteSlug, count] of [...bySite.entries()].sort()) {
    console.log(`- ${siteSlug}: ${count} URL(s)`);
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
