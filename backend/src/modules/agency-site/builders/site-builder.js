const tree = require("../templates/default-tree");
const { slugify } = require("../utils/slug");

class SiteBuilder {
  build(agency, requestedSlug) {
    const agencySlug = slugify(requestedSlug || agency.name || agency.city);
    if (!agencySlug) throw new Error("Impossible de générer le slug de l'agence");
    const basePath = `/agence/${agencySlug}`;
    const agencyName = agency.name || `Agence Mondescale ${agency.city}`;
    const city = agency.city || "votre ville";
    const pages = tree.map((page) => ({
      ...page,
      path: page.slug ? `${basePath}/${page.slug}` : basePath,
      seoTitle: page.pageType === "HOME"
        ? `${agencyName} | Agence de voyages à ${city}`
        : `${page.title} | ${agencyName}`,
      metaDescription: page.pageType === "HOME"
        ? `Découvrez ${agencyName}, votre agence de voyages à ${city}, ses services, destinations et conseils personnalisés.`
        : `${page.title} chez ${agencyName}, votre agence de voyages à ${city}.`,
      h1: page.pageType === "HOME" ? agencyName : page.title,
      schemaType: page.pageType === "HOME" ? "TravelAgency" : "WebPage"
    }));
    return {
      site: { agencyId: agency.id, name: agencyName, slug: agencySlug, basePath, status: "draft", theme: "mondescale-default" },
      pages
    };
  }
}
module.exports = SiteBuilder;
