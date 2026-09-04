import { resolvedTargetCities } from "./local-area-config";

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
  return resolvedTargetCities(site, { limit: 4 });
}

function pageKind(pageSlug, page) {
  const slug = normalizeSlug(pageSlug || page?.slug);
  const title = clean(page?.title).toLocaleLowerCase("fr-FR");

  if (!slug || ["home", "accueil", "index"].includes(slug)) return "home";
  if (["agence", "notre-agence"].includes(slug)) return "agency";
  if (["equipe", "team", "notre-equipe"].includes(slug)) return "team";
  if (slug === "services" || /service/.test(title)) return "services";
  if (["destinations", "destination"].includes(slug) || /destination/.test(title)) return "destinations";
  if (["inspirations", "inspiration", "idees-voyage"].includes(slug) || /inspiration|idée.*voyage/.test(title)) return "inspirations";
  if (["offres", "offers", "promotions"].includes(slug) || /offre|promotion/.test(title)) return "offers";
  if (["avis", "reviews", "avis-clients"].includes(slug) || /avis client/.test(title)) return "reviews";
  if (["engagements", "commitments"].includes(slug) || /engagement/.test(title)) return "commitments";
  if (["partenaires", "partners"].includes(slug) || /partenaire/.test(title)) return "partners";
  if (["contact", "nous-contacter"].includes(slug) || /contact/.test(title)) return "contact";
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
      return `Agence de voyage à ${city} | ${brand}`;
    case "agency":
      return `Votre agence de voyages à ${city} | ${brand}`;
    case "team":
      return `Équipe de votre agence de voyages à ${city} | ${brand}`;
    case "services":
      return `Services de voyage à ${city} | ${brand}`;
    case "destinations":
      return `Destinations & voyages depuis ${city} | ${brand}`;
    case "inspirations":
      return `Idées voyage & inspirations à ${city} | ${brand}`;
    case "offers":
      return `Offres de voyages à ${city} | ${brand}`;
    case "reviews":
      return `Avis clients de votre agence à ${city} | ${brand}`;
    case "commitments":
      return `Nos engagements voyage à ${city} | ${brand}`;
    case "partners":
      return `Partenaires voyage de votre agence à ${city} | ${brand}`;
    case "contact":
      return `Agence de voyages à ${city} : contact | ${brand}`;
    default:
      return pageTitle
        ? `${pageTitle} à ${city} | ${brand}`
        : `Agence de voyages à ${city} | ${brand}`;
  }
}

function headingForKind({ kind, city, pageTitle }) {
  if (!city) return pageTitle || "Votre agence de voyages";

  switch (kind) {
    case "home":
      return `Agence de voyages à ${city}`;
    case "agency":
      return `Votre agence de voyages à ${city}`;
    case "team":
      return `Votre équipe de conseillers voyage à ${city}`;
    case "services":
      return `Services de votre agence de voyages à ${city}`;
    case "destinations":
      return `Destinations et voyages depuis ${city}`;
    case "inspirations":
      return `Inspirations voyage depuis ${city}`;
    case "offers":
      return `Offres de voyages à ${city}`;
    case "reviews":
      return `Avis clients de votre agence de voyages à ${city}`;
    case "commitments":
      return `Les engagements de votre agence à ${city}`;
    case "partners":
      return `Les partenaires de votre agence de voyages à ${city}`;
    case "contact":
      return `Contacter votre agence de voyages à ${city}`;
    default:
      return pageTitle ? `${pageTitle} à ${city}` : `Agence de voyages à ${city}`;
  }
}

function descriptionForKind({ kind, site, page }) {
  const city = localCity(site);
  const brand = brandLabel(site);
  const pageTitle = clean(page?.title);
  const where = city ? ` à ${city}` : "";
  let lead;

  switch (kind) {
    case "agency":
      lead = `Découvrez ${brand}${where}, votre agence de voyages locale : équipe, expertise et accompagnement personnalisé pour construire votre projet.`;
      break;
    case "team":
      lead = `Rencontrez l’équipe ${brand}${where} : des conseillers voyage à votre écoute pour préparer séjours, circuits, croisières et sur mesure.`;
      break;
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
    case "reviews":
      lead = `Consultez les avis clients de ${brand}${where} et découvrez l’expérience des voyageurs accompagnés par notre équipe pour leurs projets.`;
      break;
    case "commitments":
      lead = `Découvrez les engagements de ${brand}${where} : écoute, conseil, expertise et accompagnement avant, pendant et après votre voyage.`;
      break;
    case "partners":
      lead = `Découvrez les partenaires voyage sélectionnés par ${brand}${where} pour construire des séjours, circuits et expériences adaptés à vos envies.`;
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
    heading: headingForKind({ kind, city, pageTitle }),
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
  headingForKind,
  localCity,
  pageKind,
  preferLocalOverride,
  targetCities,
  truncateSentence,
};
