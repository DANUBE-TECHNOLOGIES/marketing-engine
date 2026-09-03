import { aggregateLocalSeoSite, scoreLocalSeoPage } from "../lib/seo/local-seo-score.mjs";

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
const minimumWords = Math.max(60, Number(args.get("minimum-words") || 140));
const minimumSiteScore = Math.min(100, Math.max(0, Number(args.get("minimum-site-score") || 0)));
const jsonOutput = args.get("json") === true || args.get("json") === "true";
const gate = args.get("gate") === true || args.get("gate") === "true";

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

function allMatches(html, expression) {
  return [...String(html || "").matchAll(expression)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function firstMatch(html, expression) {
  return allMatches(html, expression)[0] || "";
}

function metaContent(html, name, attribute = "name") {
  const patterns = [
    new RegExp(`<meta[^>]+${attribute}=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attribute}=["']${name}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }
  return "";
}

function canonicalHref(html) {
  return firstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i) ||
    firstMatch(html, /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i);
}

function sitemapUrls(xml) {
  return [...String(xml || "").matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeEntities(match[1]).trim())
    .filter((url) => url.startsWith(`${origin}/agence/`))
    .slice(0, limit);
}

function jsonLdDocuments(html) {
  const documents = [];
  for (const match of String(html || "").matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { documents.push(JSON.parse(decodeEntities(match[1]).trim())); } catch {}
  }
  return documents;
}

function schemaNodes(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(schemaNodes);
  const nodes = [value];
  if (Array.isArray(value["@graph"])) nodes.push(...value["@graph"].flatMap(schemaNodes));
  return nodes;
}

function schemaOfType(documents, expected) {
  return documents.flatMap(schemaNodes).find((node) => {
    const type = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
    return type.includes(expected);
  }) || null;
}

function pageKind(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean).slice(2);
  if (!parts.length) return "home";
  if (parts[0] === "destination") return "destination-detail";
  if (parts[0] === "inspiration" && parts.length > 1) return "inspiration-detail";
  return parts[0];
}

function siteSlug(url) {
  return new URL(url).pathname.split("/").filter(Boolean)[1] || "unknown";
}

function visibleMainText(html) {
  const source = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  return stripTags(source.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || source);
}

function wordCount(value) {
  return String(value || "").split(/\s+/).filter((word) => word.trim().length > 1).length;
}

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr-FR");
}

function includesCity(value, city) {
  return city ? normalize(value).includes(normalize(city)) : false;
}

function localSignalRequired(kind) {
  return !["destination-detail", "inspiration-detail", "mentions-legales", "confidentialite"].includes(kind);
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mondescale-Local-SEO-Score/1.1" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
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
    const agency = schemaOfType(schemas, "TravelAgency") || {};
    const webPage = schemaOfType(schemas, "WebPage");
    const breadcrumb = schemaOfType(schemas, "BreadcrumbList");
    const h1s = allMatches(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const text = visibleMainText(html);
    const city = String(agency?.address?.addressLocality || "").trim();
    const kind = pageKind(url);
    const areaServed = Array.isArray(agency.areaServed) ? agency.areaServed : agency.areaServed ? [agency.areaServed] : [];

    const row = {
      url,
      siteSlug: siteSlug(url),
      pageKind: kind,
      title,
      description: metaContent(html, "description"),
      canonical: canonicalHref(html),
      robots: metaContent(html, "robots"),
      h1: h1s[0] || "",
      h1Count: h1s.length,
      ogTitle: metaContent(html, "og:title", "property"),
      ogDescription: metaContent(html, "og:description", "property"),
      ogImage: metaContent(html, "og:image", "property"),
      hasTravelAgency: Boolean(agency?.["@type"]),
      hasWebPage: Boolean(webPage),
      hasBreadcrumb: Boolean(breadcrumb),
      hasPrimaryImage: Boolean(webPage?.primaryImageOfPage?.url),
      hasAgencyImage: Boolean(agency.image),
      hasAgencyLogo: Boolean(agency.logo),
      hasAreaServed: areaServed.length > 0,
      hasNap: Boolean(agency.name && agency.telephone && agency?.address?.streetAddress && agency?.address?.postalCode && city),
      city,
      cityInTitle: includesCity(title, city),
      cityInH1: includesCity(h1s[0] || "", city),
      cityInText: includesCity(text, city),
      localSignalRequired: localSignalRequired(kind),
      wordCount: wordCount(text),
    };
    row.score = scoreLocalSeoPage(row, { minimumWords });
    rows.push(row);
  } catch (error) {
    errors.push({ url, error: error.message });
  }
}

const bySite = new Map();
for (const row of rows) {
  if (!bySite.has(row.siteSlug)) bySite.set(row.siteSlug, []);
  bySite.get(row.siteSlug).push(row);
}

const sites = [...bySite.entries()].map(([site, pages]) => ({
  site,
  ...aggregateLocalSeoSite(pages, { minimumWords }),
})).sort((a, b) => b.total - a.total);
const failingSites = minimumSiteScore > 0
  ? sites.filter((site) => site.total < minimumSiteScore)
  : [];

if (jsonOutput) {
  console.log(JSON.stringify({
    origin,
    generatedAt: new Date().toISOString(),
    minimumSiteScore,
    pages: rows,
    sites,
    failingSites,
    errors,
  }, null, 2));
} else {
  console.log(`Score SEO local Mondescale · ${rows.length}/${urls.length} pages analysées`);
  console.log(`Mini-sites : ${sites.length} · erreurs HTTP : ${errors.length}`);
  if (minimumSiteScore) console.log(`Seuil mini-site : ${minimumSiteScore}/100 · sous seuil : ${failingSites.length}`);
  console.log("\nCLASSEMENT MINI-SITES");
  for (const item of sites) {
    console.log(`- ${item.total}/100 (${item.grade}) · ${item.site} · ${item.pages} page(s) · tech ${item.dimensions.technical}/30 · local ${item.dimensions.local}/30 · contenu ${item.dimensions.content}/25 · média ${item.dimensions.media}/15`);
  }

  const weakest = rows.slice().sort((a, b) => a.score.total - b.score.total).slice(0, 25);
  if (weakest.length) {
    console.log("\nPAGES PRIORITAIRES");
    for (const row of weakest) console.log(`- ${row.score.total}/100 (${row.score.grade}) · ${row.url}`);
  }

  if (failingSites.length) {
    console.log("\nMINI-SITES SOUS LE SEUIL");
    for (const item of failingSites) console.log(`- ${item.total}/100 · ${item.site}`);
  }

  if (errors.length) {
    console.log("\nERREURS HTTP");
    for (const item of errors) console.log(`- ${item.url}: ${item.error}`);
  }
}

if (gate && (errors.length || failingSites.length)) {
  process.exitCode = 1;
}
