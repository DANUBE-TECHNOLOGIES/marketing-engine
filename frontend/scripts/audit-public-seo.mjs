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

function metaContent(html, name) {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["'][^>]*>`, "i"),
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

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mondescale-SEO-Audit/1.0",
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
    const row = {
      url,
      title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
      description: metaContent(html, "description"),
      canonical: canonicalHref(html),
      h1: firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
      robots: metaContent(html, "robots"),
    };
    rows.push(row);
  } catch (error) {
    errors.push({ url, error: error.message });
  }
}

const issues = [];
for (const row of rows) {
  if (!row.title) issues.push(`${row.url}: title manquant`);
  if (!row.description) issues.push(`${row.url}: meta description manquante`);
  if (!row.canonical) issues.push(`${row.url}: canonical manquant`);
  if (row.canonical && row.canonical !== row.url) {
    issues.push(`${row.url}: canonical différent (${row.canonical})`);
  }
  if (!row.h1) issues.push(`${row.url}: H1 manquant`);
  if (/noindex/i.test(row.robots)) issues.push(`${row.url}: noindex présent dans le sitemap`);
  if (row.title.length > 70) issues.push(`${row.url}: title long (${row.title.length})`);
  if (row.description.length > 170) issues.push(`${row.url}: description longue (${row.description.length})`);
}

for (const group of duplicateGroups(rows, "title")) {
  issues.push(`Title dupliqué sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}
for (const group of duplicateGroups(rows, "description")) {
  issues.push(`Description dupliquée sur ${group.urls.length} URLs: ${group.urls.join(" | ")}`);
}

console.log(`SEO audit public: ${rows.length}/${urls.length} pages analysées.`);
console.log(`Origine: ${origin}`);
console.log(`Erreurs HTTP: ${errors.length}`);
console.log(`Alertes SEO: ${issues.length}`);

if (errors.length) {
  console.log("\nERREURS HTTP");
  for (const item of errors) console.log(`- ${item.url}: ${item.error}`);
}

if (issues.length) {
  console.log("\nALERTES SEO");
  for (const issue of issues) console.log(`- ${issue}`);
} else {
  console.log("\nOK: aucun problème SEO structurel détecté sur les URLs du sitemap.");
}

if (strict && (errors.length || issues.length)) {
  process.exitCode = 1;
}
