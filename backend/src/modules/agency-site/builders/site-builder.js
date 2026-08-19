const tree = require("../templates/default-tree");
const { slugify } = require("../utils/slug");

class SiteBuilder {
  build(agency, requestedSlug) {
    const agencySlug = slugify(requestedSlug || agency.name || agency.city);
    if (!agencySlug) throw new Error("Impossible de générer le slug de l'agence");
    const basePath = `/agence/${agencySlug}`;
    const agencyName = agency.name || `Agence Mondescale ${agency.city}`;
    const city = agency.city || "votre ville";
    const pages = tree.map((page) => {
      const isHome = page.pageType === "HOME";
      const isPartners = page.pageType === "PARTNERS";
      return {
        ...page,
        path: page.slug ? `${basePath}/${page.slug}` : basePath,
        seoTitle: isHome
          ? `${agencyName} | Agence de voyages à ${city}`
          : isPartners
            ? `Partenaires voyage à ${city} | ${agencyName}`
            : `${page.title} | ${agencyName}`,
        metaDescription: isHome
          ? `Découvrez ${agencyName}, votre agence de voyages à ${city}, ses services, destinations et conseils personnalisés.`
          : isPartners
            ? `Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par ${agencyName} à ${city} pour construire votre prochain voyage.`
            : `${page.title} chez ${agencyName}, votre agence de voyages à ${city}.`,
        h1: isHome ? agencyName : isPartners ? `Nos partenaires voyage à ${city}` : page.title,
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