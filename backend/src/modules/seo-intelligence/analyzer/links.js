"use strict";
const { flatten, clean, unique } = require("./utils");
function analyzeLinks(page = {}) {
  const payloads = (page.sections || []).map(section => section.jsonContent || section.content || section);
  const urls = unique(flatten(payloads).filter(item => /^(href|url|link|canonical)$/i.test(item.key)).map(item => clean(item.value)));
  const internal = urls.filter(url => url.startsWith("/") || (page.site && url.includes(page.site.slug)));
  const external = urls.filter(url => /^https?:\/\//i.test(url) && !internal.includes(url));
  return { internal, external, checks: [
    rule("links.internal", internal.length >= 2, 8, "warning", "Ajouter au moins deux liens internes contextuels.", { actual: internal.length }),
    rule("links.external", external.length >= 1, 2, "info", "Ajouter une source externe fiable lorsque cela apporte de la valeur.", { actual: external.length })
  ]};
}
function rule(id, passed, weight, severity, recommendation, details) { return { id, category: "links", passed, weight, severity, recommendation, details: details || null }; }
module.exports = { analyzeLinks };
