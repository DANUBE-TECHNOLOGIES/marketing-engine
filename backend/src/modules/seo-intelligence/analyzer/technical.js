"use strict";
const { flatten, clean } = require("./utils");
function analyzeTechnical(page = {}) {
  const payloads = (page.sections || []).map(section => section.jsonContent || section.content || section);
  const flat = flatten(payloads);
  const schemaType = clean(page.schemaType);
  const hasJsonLd = Boolean(schemaType) || flat.some(item => /(@type|schema|jsonld)/i.test(item.key));
  const hasOg = flat.some(item => /^og(title|description|image)$/i.test(item.key));
  const hasTwitter = flat.some(item => /^twitter(card|title|description|image)$/i.test(item.key));
  const indexable = !["archived", "deleted"].includes(String(page.status || "").toLowerCase());
  return { schemaType, hasJsonLd, hasOg, hasTwitter, indexable, checks: [
    rule("technical.schema", hasJsonLd, 7, "warning", "Ajouter des données structurées Schema.org."),
    rule("technical.indexable", indexable, 4, "critical", "Rendre la page indexable avant publication."),
    rule("technical.opengraph", hasOg, 3, "info", "Ajouter les métadonnées Open Graph."),
    rule("technical.twitter", hasTwitter, 2, "info", "Ajouter les métadonnées Twitter Card.")
  ]};
}
function rule(id, passed, weight, severity, recommendation) { return { id, category: "technical", passed, weight, severity, recommendation, details: null }; }
module.exports = { analyzeTechnical };
