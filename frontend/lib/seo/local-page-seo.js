const DEFAULT_BRAND = "Mondescale";
const MAX_DESCRIPTION_LENGTH = 165;

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value) {
  return clean(value).toLowerCase();
}

function agencyData(site) {
  return site?.agency || {};
}

function localCity(site) {
  return clean(agencyData(site).city || site?.city);
}

function brandLabel(site) {
  const name = clean(site?.name || agencyData(site).name);

  if (/mondescale/i.test(name)) {
    return DEFAULT_BRAND;
  }

  return name || DEFAULT_BRAND;
}

function targetCities(site) {
  const agency = agencyData(site);
  const primary = localCity(site).toLocaleLowerCase("fr-FR");
  const values =
    site?.targetCities ||
    site?.metadata?.targetCities ||
    agency?.targetCities ||
    [];

  if (!Array.isArray(values)) return [];

  const seen = new Set();
  const result = [];

  for (const value of values) {
    const city = clean(
      typeof value === "string"
        ? value
        : value?.name || value?.city
    );

    if (!city) continue;

    const key = city.toLocaleLowerCase("fr-FR");
    if (key === primary || seen.has(key)) continue;

    seen.add(key);
    result.push(city);
  }

  return result.slice(0, 4);
}

function pageKind(pageSlug, page) {
  const slug = normalizeSlug(pageSlug || page?.slug);
  const title = clean(page?.title).toLocaleLowerCase("fr-FR");

  if (!slug || ["home", "accueil", "index"].includes(slug)) return "home";
  if (slug === "services" || /service/.test(title)) return "services";
  if (["destinations", "destination"].includes(slug) || /destination/.test(title)) return "destinations";
  if (["inspirations", "inspiration", "idees-voyage"].includes(slug) || /inspiration|idée.*voyage/.test(title)) return "inspirations";
  if (["offres", "offers", "promotions"].includes(slug) || /offre|promotion/.test(title)) return "offers";
  if (["contact", "agence", "nous-contacter"].includes(slug) || /contact|agence/.test(title)) return "contact";
  return "generic";
}

function truncateSentence(value, limit = MAX_DESCRIPTION_LENGTH) {
  const text = clean(value);
  if (text.length <= limit) return text;

  const slice = text.slice(0, limit + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const shortened = (lastSpace > limit * 0.72 ? slice.slice(0, lastSpace) : slice.slice(0, limit))
    .replace(/[\s,;:.-]+$/g, "")
    .trim();

  return `${shortened}.`;
}

function areaPhrase(site) {
  const nearby = targetCities(site);
  if (!nearby.length) return "";

  if (nearby.length === 1) {
    return ` Nous accompagnons aussi les voyageurs de ${nearby[0]}.`;
  }

  const last = nearby[nearby.length - 1];
  const first = nearby.slice(0, -1).join(", ");
  return ` Nous accompagnons aussi les voyageurs de ${first} et ${last}.`;
}

function containsLocalSignal(value, site) {
  const text = clean(value).toLocaleLowerCase("fr-FR");
  if (!text) return false;

  const locations = [
    localCity(site),
    ...targetCities(site),
  ].filter(Boolean);

  if (!locations.length) return true;

  return locations.some((city) =>
    text.includes(city.toLocaleLowerCase("fr-FR"))
  );
}

function preferLocalOverride(value, site, fallback) {
  const candidate = clean(value);
  return candidate && containsLocalSignal(candidate, site)
    ? candidate
    : fallback;
}

function titleForKind({ kind, city, brand, pageTitle }) {
  if (!city) {
    return pageTitle ? `${pageTitle} | ${brand}` : brand;
  }

  switch (kind) {
    case "home":
      return `Agence de voyages à ${city} | ${brand}`;
    case "services":
      return `Services de voyage à ${city} | ${brand}`;
    case "destinations":
      return `Destinations & voyages depuis ${city} | ${brand}`;
    case "inspirations":
      return `Idées voyage & inspirations à ${city} | ${brand}`;
    case "offers":
      return `Offres de voyages à ${city} | ${brand}`;
    case "contact":
      return `Agence de voyages à ${city} : contact | ${brand}`;
    default:
      return pageTitle
        ? `${pageTitle} à ${city} | ${brand}`
        : `Agence de voyages à ${city} | ${brand}`;
  }
}

function descriptionForKind({ kind, site, page }) {
  const city = localCity(site);
  const brand = brandLabel(site);
  const pageTitle = clean(page?.title);
  const where = city ? ` à ${city}` : "";
  let lead;

  switch (kind) {
    case "services":
      lead = `${brand}, agence de voyages${where} : conseil personnalisé, séjours, circuits, croisières et voyages sur mesure selon votre projet.`;
      break;
    case "destinations":
      lead = `Découvrez des idées de destinations avec ${brand}${where} et préparez un voyage adapté à vos envies avec l’accompagnement de votre agence.`;
      break;
    case "inspirations":
      lead = `Inspirez votre prochain départ avec ${brand}${where} : conseils locaux, idées de séjours, circuits, escapades et voyages sur mesure.`;
      break;
    case "offers":
      lead = `Découvrez les offres de voyages sélectionnées par ${brand}${where} et bénéficiez des conseils de votre agence pour choisir le séjour adapté.`;
      break;
    case "contact":
      lead = `Contactez ${brand}${where} pour préparer votre voyage : conseils personnalisés, devis, séjours, circuits, croisières et sur mesure.`;
      break;
    case "generic":
      lead = `${pageTitle || "Conseils voyage"} avec ${brand}${where}. Bénéficiez de l’accompagnement d’une agence locale pour construire votre prochain voyage.`;
      break;
    default:
      lead = `${brand}, agence de voyages${where} : conseils personnalisés, séjours, circuits, croisières et voyages sur mesure.`;
  }

  return truncateSentence(`${lead}${areaPhrase(site)}`);
}

function extractPageImage(page, site) {
  const direct = [
    page?.openGraphImageUrl,
    page?.ogImageUrl,
    page?.heroImageUrl,
  ].map(clean).find(Boolean);

  if (direct) return direct;

  const blocks = Array.isArray(page?.blocks)
    ? page.blocks
    : Array.isArray(page?.sections)
      ? page.sections
      : [];

  for (const block of blocks) {
    const content = block?.content || block?.jsonContent || block?.props || {};
    const candidate = clean(
      content.imageUrl ||
      content.image ||
      content.heroImageUrl
    );
    if (candidate) return candidate;
  }

  const agency = agencyData(site);
  return clean(
    site?.heroImageUrl ||
    agency?.imageUrl ||
    agency?.logoUrl ||
    site?.logoUrl
  ) || null;
}

export function buildLocalPageSeo({ site, page, pageSlug }) {
  const kind = pageKind(pageSlug, page);
  const city = localCity(site);
  const brand = brandLabel(site);
  const pageTitle = clean(page?.title);
  const generatedTitle = titleForKind({ kind, city, brand, pageTitle });
  const generatedDescription = descriptionForKind({ kind, site, page });

  return {
    kind,
    city,
    brand,
    title: preferLocalOverride(page?.seoTitle, site, generatedTitle),
    description: preferLocalOverride(
      page?.metaDescription || page?.seoDescription,
      site,
      generatedDescription
    ),
    image: extractPageImage(page, site),
    targetCities: targetCities(site),
  };
}

export {
  MAX_DESCRIPTION_LENGTH,
  areaPhrase,
  brandLabel,
  containsLocalSignal,
  extractPageImage,
  localCity,
  pageKind,
  preferLocalOverride,
  targetCities,
  truncateSentence,
};
