const tree = require("../templates/default-tree");
const { slugify } = require("../utils/slug");

const SECONDARY_SEO = {
  AGENCY: {
    title: (city, agencyName) => `Agence de voyages à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Découvrez ${agencyName}, votre agence de voyages à ${city} : accompagnement, conseils personnalisés et informations pratiques pour préparer votre prochain voyage.`,
    h1: (city) => `Votre agence de voyages à ${city}`
  },
  TEAM: {
    title: (city, agencyName) => `Conseillers voyage à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Rencontrez l’équipe de ${agencyName}, vos conseillers voyage à ${city}, et profitez d’un accompagnement de proximité pour construire votre prochain séjour.`,
    h1: (city) => `Notre équipe de conseillers voyage à ${city}`
  },
  COMMITMENTS: {
    title: (city, agencyName) => `Nos engagements à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Découvrez les engagements de ${agencyName} à ${city} : écoute, clarté, disponibilité et accompagnement humain pour préparer votre voyage.`,
    h1: (city) => `Les engagements de votre agence de voyages à ${city}`
  },
  PARTNERS: {
    title: (city, agencyName) => `Partenaires voyage à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par ${agencyName} à ${city} pour construire votre prochain voyage.`,
    h1: (city) => `Nos partenaires de voyage à ${city}`
  },
  SERVICES: {
    title: (city, agencyName) => `Services de votre agence de voyages à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Séjours, circuits, croisières, voyages sur mesure et billetterie : découvrez les services proposés par ${agencyName}, votre agence de voyages à ${city}.`,
    h1: (city) => `Nos services de voyage à ${city}`
  },
  DESTINATIONS: {
    title: (city, agencyName) => `Destinations de voyage au départ de ${city} | ${agencyName}`,
    description: (city, agencyName) => `Explorez les destinations proposées par ${agencyName} à ${city} et trouvez avec votre conseiller le voyage adapté à la saison, à vos envies et à votre budget.`,
    h1: (city) => `Nos destinations de voyage à ${city}`
  },
  INSPIRATIONS: {
    title: (city, agencyName) => `Idées et inspirations voyage à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Famille, couple, circuit, croisière ou grands espaces : trouvez des inspirations avec ${agencyName}, votre agence de voyages à ${city}.`,
    h1: (city) => `Inspirations voyage à ${city}`
  },
  REVIEWS: {
    title: (city, agencyName) => `Avis clients de votre agence de voyages à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Consultez les avis et retours des voyageurs accompagnés par ${agencyName}, votre agence de voyages à ${city}.`,
    h1: (city) => `Avis clients de notre agence à ${city}`
  },
  CONTACT: {
    title: (city, agencyName) => `Contacter votre agence de voyages à ${city} | ${agencyName}`,
    description: (city, agencyName) => `Contactez ${agencyName} à ${city} pour préparer votre voyage, demander un devis ou échanger avec un conseiller.`,
    h1: (city) => `Contactez votre agence de voyages à ${city}`
  }
};

class SiteBuilder {
  build(agency, requestedSlug) {
    const agencySlug = slugify(requestedSlug || agency.name || agency.city);
    if (!agencySlug) throw new Error("Impossible de générer le slug de l'agence");
    const basePath = `/agence/${agencySlug}`;
    const agencyName = agency.name || `Agence Mondescale ${agency.city}`;
    const city = agency.city || "votre ville";
    const pages = tree.map((page) => {
      const isHome = page.pageType === "HOME";
      const seo = SECONDARY_SEO[page.pageType];
      return {
        ...page,
        path: page.slug ? `${basePath}/${page.slug}` : basePath,
        seoTitle: isHome
          ? `${agencyName} | Agence de voyages à ${city}`
          : seo
            ? seo.title(city, agencyName)
            : `${page.title} | ${agencyName}`,
        metaDescription: isHome
          ? `Découvrez ${agencyName}, votre agence de voyages à ${city}, ses services, destinations et conseils personnalisés.`
          : seo
            ? seo.description(city, agencyName)
            : `${page.title} chez ${agencyName}, votre agence de voyages à ${city}.`,
        h1: isHome ? agencyName : seo ? seo.h1(city, agencyName) : page.title,
        schemaType: isHome ? "TravelAgency" : "WebPage"
      };
    });
    return {
      site: { agencyId: agency.id, name: agencyName, slug: agencySlug, basePath, status: "draft", theme: "mondescale-default" },
      pages
    };
  }
}
module.exports = SiteBuilder;
