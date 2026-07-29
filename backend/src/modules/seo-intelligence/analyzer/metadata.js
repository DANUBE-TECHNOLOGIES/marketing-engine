"use strict";
const { clean } = require("./utils");

function analyzeMetadata(page = {}) {
  const title = clean(page.seoTitle || page.title);
  const description = clean(page.metaDescription);
  const canonical = clean(page.canonical || page.canonicalUrl || page.path);
  return {
    title,
    description,
    canonical,
    titleLength: title.length,
    descriptionLength: description.length,
    checks: [
      rule("meta.title.present", Boolean(title), 6, "critical", "Ajouter un titre SEO."),
      rule("meta.title.length", title.length >= 30 && title.length <= 60, 6, "warning", "Conserver le titre SEO entre 30 et 60 caractères.", { actual: title.length }),
      rule("meta.description.present", Boolean(description), 5, "critical", "Ajouter une méta-description."),
      rule("meta.description.length", description.length >= 120 && description.length <= 160, 5, "warning", "Conserver la méta-description entre 120 et 160 caractères.", { actual: description.length }),
      rule("meta.canonical", Boolean(canonical), 3, "warning", "Définir une URL canonique.")
    ]
  };
}
function rule(id, passed, weight, severity, recommendation, details) { return { id, category: "metadata", passed, weight, severity, recommendation, details: details || null }; }
module.exports = { analyzeMetadata };
