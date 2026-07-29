import SectionRenderer from "../agency-site/SectionRenderer";

const registry = new Map();

export function registerBlock(type, component) {
  if (!type || typeof component !== "function") throw new Error("Invalid page-builder block registration");
  registry.set(type, component);
}

export function getBlock(type) {
  return registry.get(type) || SectionRenderer;
}

export function listBlocks() {
  return Array.from(registry.keys());
}

["hero", "page-header", "richText", "cards", "faq", "highlights", "destination-recommendations", "contact-details", "agency-details", "contact-cta", "map-placeholder", "legal-notice", "privacy-notice"].forEach((type) => registerBlock(type, SectionRenderer));
