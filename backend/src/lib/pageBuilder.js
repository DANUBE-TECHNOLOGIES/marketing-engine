const { buildBreadcrumbItems } = require("./seo/breadcrumbs");
const { buildMetadata } = require("./seo/metadata");
const { buildStructuredData } = require("./seo/structuredData");

const BLOCK_DEFINITIONS = Object.freeze({
  hero: { label: "Hero", category: "header", required: ["title"] },
  "page-header": { label: "En-tête de page", category: "header", required: ["title"] },
  breadcrumb: { label: "Fil d’Ariane", category: "seo", required: ["items"] },
  intro: { label: "Introduction SEO", category: "seo", required: ["text"] },
  climate: { label: "Climat", category: "travel", required: [] },
  richText: { label: "Texte éditorial", category: "content", required: [] },
  cards: { label: "Cartes", category: "content", required: ["items"] },
  faq: { label: "FAQ", category: "seo", required: ["items"] },
  highlights: { label: "Points forts", category: "travel", required: ["items"] },
  "destination-recommendations": { label: "Destinations similaires", category: "travel", required: ["items"] },
  "contact-details": { label: "Coordonnées", category: "conversion", required: [] },
  "contact-cta": { label: "Appel à l'action", category: "conversion", required: ["title"] },
  "map-placeholder": { label: "Carte", category: "local", required: [] },
  "legal-notice": { label: "Mentions légales", category: "legal", required: [] },
  "privacy-notice": { label: "Confidentialité", category: "legal", required: [] },
});

const TEMPLATE_DEFINITIONS = Object.freeze({
  "agency-home": {
    label: "Accueil agence",
    pageType: "home",
    blocks: ["hero", "highlights", "cards", "destination-recommendations", "contact-cta"],
  },
  destination: {
    label: "Destination SEO",
    pageType: "destination",
    blocks: ["breadcrumb", "hero", "intro", "climate", "highlights", "cards", "faq", "destination-recommendations", "contact-cta"],
  },
  contact: {
    label: "Contact agence",
    pageType: "contact",
    blocks: ["page-header", "contact-details", "map-placeholder", "contact-cta"],
  },
});

function normalizeBlock(section, index = 0) {
  const type = section?.sectionType || section?.type || "richText";
  const content = section?.jsonContent || section?.content || {};
  return {
    id: section?.id || `block-${index + 1}`,
    type,
    content,
    order: Number.isFinite(section?.displayOrder) ? section.displayOrder : index,
    definition: BLOCK_DEFINITIONS[type] || { label: type, category: "custom", required: [] },
  };
}

function validateBlock(block) {
  const definition = BLOCK_DEFINITIONS[block.type];
  if (!definition) return { valid: false, errors: [`Type de bloc inconnu: ${block.type}`] };
  const errors = definition.required
    .filter((field) => block.content?.[field] == null)
    .map((field) => `Champ requis manquant: ${field}`);
  return { valid: errors.length === 0, errors };
}

function composePage(page, site, options = {}) {
  const blocks = (page?.sections || []).map(normalizeBlock).sort((a, b) => a.order - b.order);
  const validations = blocks.map((block) => ({ id: block.id, type: block.type, ...validateBlock(block) }));
  const breadcrumbs = buildBreadcrumbItems({ site, page });
  const metadata = buildMetadata({ site, page, blocks, baseUrl: options.baseUrl });
  const structuredData = buildStructuredData({ site, page, blocks, breadcrumbs, baseUrl: options.baseUrl });
  return {
    version: "1.1",
    site: site ? { id: site.id, name: site.name, slug: site.slug, basePath: site.basePath, theme: site.theme } : null,
    page: {
      id: page?.id, title: page?.title, slug: page?.slug || "", path: page?.path, pageType: page?.pageType,
      seo: { title: page?.seoTitle, description: page?.metaDescription, h1: page?.h1, schemaType: page?.schemaType },
    },
    seo: { metadata, breadcrumbs, structuredData },
    blocks,
    valid: validations.every((item) => item.valid),
    validations,
  };
}

module.exports = { BLOCK_DEFINITIONS, TEMPLATE_DEFINITIONS, normalizeBlock, validateBlock, composePage };
