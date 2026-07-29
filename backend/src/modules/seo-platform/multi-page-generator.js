"use strict";

const DEFAULT_VARIANTS = [
  { key: "pillar", suffix: "", intent: "destination" },
  { key: "weekend", suffix: "week-end", intent: "city-break" },
  { key: "family", suffix: "famille", intent: "family" },
  { key: "luxury", suffix: "luxe", intent: "luxury" },
  { key: "food", suffix: "gastronomie", intent: "food" },
  { key: "guide", suffix: "guide", intent: "guide" },
  { key: "when", suffix: "quand-partir", intent: "seasonality" },
  { key: "things", suffix: "que-faire", intent: "activities" }
];

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function create({ sdk }) {
  function plan(input = {}) {
    const destination = input.destination || input.name || input.topic;
    if (!destination) throw new TypeError("Destination obligatoire.");

    const baseSlug = slugify(input.slug || destination);
    const variants = Array.isArray(input.variants) && input.variants.length
      ? input.variants
      : DEFAULT_VARIANTS;

    const pages = variants.map((variant, index) => {
      const suffix = variant.suffix ? `-${slugify(variant.suffix)}` : "";
      const slug = `${baseSlug}${suffix}`;
      return {
        id: `${baseSlug}:${variant.key || index}`,
        type: variant.key || "custom",
        intent: variant.intent || "informational",
        slug,
        path: `/${slug}`,
        title: variant.title || buildTitle(destination, variant.key),
        keyword: variant.keyword || buildKeyword(destination, variant.key),
        parent: variant.key === "pillar" ? null : `/${baseSlug}`,
        status: "planned"
      };
    });

    sdk.events.publish("seo.plan.created", {
      destination,
      pageCount: pages.length
    });

    return {
      destination,
      baseSlug,
      pageCount: pages.length,
      pages
    };
  }

  return { plan, slugify };
}

function buildTitle(destination, key) {
  const titles = {
    pillar: `Voyage à ${destination} : guide complet`,
    weekend: `Week-end à ${destination}`,
    family: `${destination} en famille`,
    luxury: `Séjour de luxe à ${destination}`,
    food: `Gastronomie à ${destination}`,
    guide: `Guide pratique de ${destination}`,
    when: `Quand partir à ${destination} ?`,
    things: `Que faire à ${destination} ?`
  };
  return titles[key] || `Découvrir ${destination}`;
}

function buildKeyword(destination, key) {
  const prefixes = {
    pillar: `voyage ${destination}`,
    weekend: `week-end ${destination}`,
    family: `${destination} en famille`,
    luxury: `séjour luxe ${destination}`,
    food: `gastronomie ${destination}`,
    guide: `guide ${destination}`,
    when: `quand partir ${destination}`,
    things: `que faire ${destination}`
  };
  return prefixes[key] || destination;
}

module.exports = { create, slugify, DEFAULT_VARIANTS };
