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

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value) {
  return clean(decodeEntities(String(value || "").replace(/<[^>]*>/g, " ")));
}

function wordCount(value) {
  const text = clean(value);
  return text ? text.split(/\s+/).filter((word) => word.length > 1).length : 0;
}

function sitemapUrls(xml) {
  return [...String(xml || "").matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => decodeEntities(match[1]).trim())
    .filter((url) => url.startsWith(`${origin}/agence/`))
    .slice(0, limit);
}

function visibleText(html) {
  const source = String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ");
  const main = source.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || source;
  return stripTags(main);
}

function jsonLd(html) {
  const documents = [];
  for (const match of String(html || "").matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  )) {
    try {
      documents.push(JSON.parse(decodeEntities(match[1]).trim()));
    } catch {}
  }
  return documents;
}

function flattenNodes(value) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap(flattenNodes);
  const nodes = [value];
  if (Array.isArray(value["@graph"])) nodes.push(...value["@graph"].flatMap(flattenNodes));
  return nodes;
}

function schemaOfType(documents, expected) {
  return documents.flatMap(flattenNodes).find((node) => {
    const type = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]];
    return type.includes(expected);
  }) || null;
}

function pageKind(url) {
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

function siteSlug(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean)[1] || "unknown";
  } catch {
    return "unknown";
  }
}

function recommendationsFor(row) {
  const actions = [];
  if (row.words < minimumWords) {
    actions.push(`HIGH · Enrichir le contenu visible (${row.words} mots, cible minimale ${minimumWords}).`);
  }
  if (!row.cityInText && !["destination-detail", "inspiration-detail"].includes(row.kind)) {
    actions.push(`HIGH · Ajouter un contexte utile propre à ${row.city || "la ville de l’agence"} dans le contenu visible.`);
  }
  if (!row.phone || !row.street || !row.postalCode || !row.city) {
    actions.push("HIGH · Compléter et harmoniser le NAP avec la fiche Google Business Profile.");
  }
  switch (row.kind) {
    case "home":
      actions.push("MEDIUM · Ajouter au moins une preuve locale différenciante : équipe, expertise, histoire ou sélection éditoriale propre.");
      break;
    case "services":
      actions.push("MEDIUM · Décrire les services et spécialités réellement proposés par cette agence avec des exemples concrets.");
      break;
    case "equipe":
    case "team":
      actions.push("MEDIUM · Enrichir les profils conseillers avec spécialités ou expériences réelles, sans biographies génériques.");
      break;
    case "destinations":
      actions.push("MEDIUM · Faire varier la sélection selon les expertises, ventes ou contenus éditoriaux propres à l’agence.");
      break;
    case "avis":
    case "reviews":
      actions.push("MEDIUM · Relier les avis propres à l’établissement aux preuves de qualité de conseil et de suivi.");
      break;
    case "contact":
      actions.push("MEDIUM · Vérifier horaires, téléphone, adresse, carte et modalités de prise de contact avec Google Business Profile.");
      break;
    case "inspiration-detail":
      actions.push("MEDIUM · Renforcer l’article avec une expertise humaine identifiable et des liens vers destinations/services pertinents.");
      break;
    case "destination-detail":
      actions.push("MEDIUM · Ajouter un angle conseil agence : saison, profil voyageur, rythme ou type de séjour réellement utile.");
      break;
  }
  return actions;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: { "user-agent": "Mondescale-SEO-Recommendations/1.0" },
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

const sitemap = await fetchText(`${origin}/sitemap.xml`);
const urls = sitemapUrls(sitemap);
const rows = [];

for (const url of urls) {
  try {
    const html = await fetchText(url);
    const documents = jsonLd(html);
    const agency = schemaOfType(documents, "TravelAgency") || {};
    const text = visibleText(html);
    const city = clean(agency?.address?.addressLocality);
    rows.push({
      url,
      site: siteSlug(url),
      kind: pageKind(url),
      words: wordCount(text),
      city,
      cityInText: city ? text.toLocaleLowerCase("fr-FR").includes(city.toLocaleLowerCase("fr-FR")) : false,
      phone: clean(agency.telephone),
      street: clean(agency?.address?.streetAddress),
      postalCode: clean(agency?.address?.postalCode),
      actions: [],
    });
  } catch (error) {
    rows.push({ url, site: siteSlug(url), kind: pageKind(url), words: 0, actions: [`HIGH · URL inaccessible : ${error.message}`] });
  }
}

for (const row of rows) {
  row.actions.push(...recommendationsFor(row));
}

const actionable = rows.filter((row) => row.actions.length);
const bySite = new Map();
for (const row of actionable) {
  if (!bySite.has(row.site)) bySite.set(row.site, []);
  bySite.get(row.site).push(row);
}

console.log(`Recommandations SEO locales : ${actionable.length}/${rows.length} pages nécessitent une action.`);
console.log(`Mini-sites concernés : ${bySite.size}.`);

for (const [site, pages] of [...bySite.entries()].sort()) {
  console.log(`\n=== ${site} ===`);
  for (const row of pages.sort((a, b) => a.words - b.words)) {
    console.log(`\n${row.url}`);
    for (const action of row.actions) console.log(`- ${action}`);
  }
}
