"use strict";
const { clean, words, flatten, collectByKeys, unique } = require("./utils");

function analyzeContent(page = {}) {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const payloads = sections.map(section => section.jsonContent || section.content || section);
  const h1s = unique([clean(page.h1), ...collectByKeys(payloads, ["h1"])]);
  const h2s = unique(collectByKeys(payloads, ["h2", "heading", "title", "subtitle"])).filter(x => !h1s.includes(x));
  const h3s = unique(collectByKeys(payloads, ["h3", "subheading"]));
  const textValues = flatten(payloads).filter(item => !/(url|href|src|alt|slug|id)$/i.test(item.key)).map(item => item.value);
  const body = [page.h1, ...textValues].join(" ");
  const wordCount = words(body).length;
  const faqQuestions = collectByKeys(payloads, ["question"]);
  return {
    h1s, h2s, h3s, wordCount, faqCount: faqQuestions.length,
    checks: [
      rule("content.h1.single", h1s.length === 1, 8, h1s.length === 0 ? "critical" : "warning", h1s.length === 0 ? "Ajouter un H1 unique." : "Conserver un seul H1 par page.", { actual: h1s.length }),
      rule("content.headings", h2s.length >= 2, 5, "warning", "Structurer le contenu avec au moins deux H2.", { actual: h2s.length }),
      rule("content.length", wordCount >= 300, 12, wordCount < 150 ? "critical" : "warning", "Développer la page jusqu’à au moins 300 mots utiles.", { actual: wordCount }),
      rule("content.sections", sections.length >= 3, 4, "warning", "Ajouter au moins trois sections structurées.", { actual: sections.length }),
      rule("content.faq", faqQuestions.length >= 2, 4, "info", "Ajouter au moins deux questions-réponses pertinentes.", { actual: faqQuestions.length })
    ]
  };
}
function rule(id, passed, weight, severity, recommendation, details) { return { id, category: "content", passed, weight, severity, recommendation, details: details || null }; }
module.exports = { analyzeContent };
