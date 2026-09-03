"use strict";

const { composeDestinationPage, buildPageCreateData } = require("./miniSiteComposer");

function text(value) { return String(value || "").trim(); }
function slug(value) { return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function genericSections({ site, title, intro, items = [], pageType, status }) {
  const sections = [
    { sectionType: "breadcrumb", jsonContent: { items: [{ name: "Accueil", href: site.basePath || `/agence/${site.slug}` }, { name: title }] } },
    { sectionType: "page-header", jsonContent: { title, text: intro } },
    { sectionType: "intro", jsonContent: { title, text: intro } },
  ];
  if (items.length) sections.push({ sectionType: "cards", jsonContent: { title: pageType === "home" ? "Explorer" : "À découvrir", items } });
  sections.push({ sectionType: "contact-cta", jsonContent: { title: "Parlons de votre projet de voyage", text: `Votre agence ${site.name} vous accompagne de la première idée jusqu’au retour.`, actions: [{ label: "Demander un devis", href: `${site.basePath || `/agence/${site.slug}`}/contact` }] } });
  return sections.map((section, displayOrder) => ({ ...section, displayOrder, status }));
}

function composeHubPage({ site, type, name, slug: requestedSlug, items = [], status = "draft", displayOrder = 50, parentId = null }) {
  const pageSlug = requestedSlug == null ? slug(name) : requestedSlug;
  const base = site.basePath || `/agence/${site.slug}`;
  const typeLabels = { home: "Accueil", destinations: "Destinations", country: "Voyages", region: "Région", theme: "Inspiration", contact: "Contact" };
  const title = type === "home" ? site.name : `${typeLabels[type] || "Découvrir"} ${name || ""}`.trim();
  const intro = type === "home" ? `Découvrez les destinations et inspirations sélectionnées par ${site.name}.` : `Préparez votre voyage ${name ? `vers ${name}` : ""} avec les conseils de ${site.name}.`;
  return {
    parentId,
    title,
    slug: pageSlug,
    path: pageSlug ? `${base}/${pageSlug}` : base,
    pageType: type,
    menuTitle: type === "home" ? "Accueil" : name || title,
    menuLocation: ["home", "contact"].includes(type) ? "main" : type,
    displayOrder,
    seoTitle: `${title} | ${site.name}`.slice(0, 70),
    metaDescription: intro.slice(0, 180),
    h1: title,
    schemaType: type === "home" ? "WebSite" : type === "contact" ? "ContactPage" : "CollectionPage",
    status,
    published: status === "published",
    sections: genericSections({ site, title, intro, items, pageType: type, status }),
  };
}

function destinationCard(destination, site) {
  return { title: destination.name, text: destination.summary || `Découvrez ${destination.name}.`, href: `${site.basePath || `/agence/${site.slug}`}/destination/${destination.slug}` };
}

function buildGenerationPlan({ site, destinations = [], publish = false } = {}) {
  if (!site?.id || !site?.slug) throw new Error("A persisted site is required");
  const status = publish ? "published" : "draft";
  const publishedDestinations = destinations.filter((item) => item.status === "published");
  const countries = new Map();
  const regions = new Map();
  const themes = new Map();
  for (const destination of publishedDestinations) {
    const country = destination.countryRef || (destination.country ? { name: destination.country, slug: slug(destination.country) } : null);
    if (country?.name) {
      const key = country.slug || slug(country.name);
      if (!countries.has(key)) countries.set(key, { ...country, slug: key, destinations: [] });
      countries.get(key).destinations.push(destination);
    }
    const region = destination.regionRef || (destination.region ? { name: destination.region, slug: slug(destination.region) } : null);
    if (region?.name) {
      const key = region.slug || slug(region.name);
      if (!regions.has(key)) regions.set(key, { ...region, slug: key, destinations: [] });
      regions.get(key).destinations.push(destination);
    }
    for (const link of destination.themes || []) {
      const theme = link.theme || link;
      if (!theme?.name) continue;
      const key = theme.slug || slug(theme.name);
      if (!themes.has(key)) themes.set(key, { ...theme, slug: key, destinations: [] });
      themes.get(key).destinations.push(destination);
    }
  }

  const cards = publishedDestinations.slice(0, 12).map((item) => destinationCard(item, site));
  const pages = [
    composeHubPage({ site, type: "home", name: site.name, slug: "", items: cards, status, displayOrder: 0 }),
    composeHubPage({ site, type: "destinations", name: "Destinations", slug: "destinations", items: cards, status, displayOrder: 10 }),
    composeHubPage({ site, type: "contact", name: "Contact", slug: "contact", items: [], status, displayOrder: 900 }),
  ];
  for (const country of countries.values()) pages.push(composeHubPage({ site, type: "country", name: country.name, slug: `pays/${country.slug}`, items: country.destinations.map((item) => destinationCard(item, site)), status, displayOrder: 100 }));
  for (const region of regions.values()) pages.push(composeHubPage({ site, type: "region", name: region.name, slug: `region/${region.slug}`, items: region.destinations.map((item) => destinationCard(item, site)), status, displayOrder: 200 }));
  for (const theme of themes.values()) pages.push(composeHubPage({ site, type: "theme", name: theme.name, slug: `theme/${theme.slug}`, items: theme.destinations.map((item) => destinationCard(item, site)), status, displayOrder: 300 }));
  for (const destination of publishedDestinations) {
    pages.push(composeDestinationPage({ destination, site, agency: site.agency, candidates: publishedDestinations, options: { status } }));
  }
  const unique = new Map(pages.map((page) => [page.path, page]));
  return { version: "1.0", site: { id: site.id, slug: site.slug }, publish, summary: { destinations: publishedDestinations.length, countries: countries.size, regions: regions.size, themes: themes.size, pages: unique.size }, pages: [...unique.values()] };
}

async function persistGenerationPlan(prisma, site, plan, { overwrite = false } = {}) {
  const report = { total: plan.pages.length, created: 0, updated: 0, skipped: 0, failed: 0, results: [] };
  for (const composed of plan.pages) {
    try {
      const existing = await prisma.agencySitePage.findUnique({ where: { path: composed.path } });
      if (existing && !overwrite) {
        report.skipped += 1; report.results.push({ path: composed.path, status: "skipped", id: existing.id }); continue;
      }
      const saved = await prisma.$transaction(async (tx) => {
        if (existing) await tx.agencySitePage.delete({ where: { id: existing.id } });
        return tx.agencySitePage.create({ data: buildPageCreateData(composed, site.id), include: { sections: { orderBy: { displayOrder: "asc" } } } });
      });
      if (existing) report.updated += 1; else report.created += 1;
      report.results.push({ path: composed.path, status: existing ? "updated" : "created", id: saved.id });
    } catch (error) {
      report.failed += 1; report.results.push({ path: composed.path, status: "failed", error: error.message });
    }
  }
  return report;
}

module.exports = { slug, composeHubPage, buildGenerationPlan, persistGenerationPlan };
