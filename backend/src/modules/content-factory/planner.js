"use strict";
const { slugify } = require("./slug");
const DEFAULT_KINDS = ["guide", "weekend", "itinerary", "family", "romantic", "best-time", "where-stay", "where-eat", "faq", "compare"];
function labelFor(kind, d) {
  const n = d.name;
  const map = {
    guide: `Voyage à ${n}`,
    weekend: `Week-end à ${n}`,
    itinerary: `${n} en 3 jours`,
    family: `${n} en famille`,
    romantic: `${n} en amoureux`,
    "best-time": `Quand partir à ${n} ?`,
    "where-stay": `Où dormir à ${n} ?`,
    "where-eat": `Où manger à ${n} ?`,
    faq: `Questions fréquentes sur ${n}`,
    compare: `${n} ou une autre destination ?`,
  };
  return map[kind] || `${n} : ${kind}`;
}
function buildPlan(destination, options = {}) {
  const kinds = (options.pageKinds?.length ? options.pageKinds : DEFAULT_KINDS).slice(0, options.limit || 10);
  const pages = kinds.map((kind, index) => {
    const title = labelFor(kind, destination);
    const slug = kind === "guide" ? destination.slug : `${destination.slug}-${slugify(kind)}`;
    return { kind, role: kind === "guide" ? "pillar" : "support", title, slug, priority: index + 1, parentSlug: kind === "guide" ? null : destination.slug };
  });
  return { destination: { id: destination.id, name: destination.name, slug: destination.slug, country: destination.country }, pages };
}
module.exports = { DEFAULT_KINDS, buildPlan, labelFor };
