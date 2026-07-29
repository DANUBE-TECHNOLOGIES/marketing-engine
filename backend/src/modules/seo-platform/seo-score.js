"use strict";

function create({ sdk }) {
  function score(input = {}) {
    const page = input.page || {};
    const content = input.content || {};
    const links = input.links || [];
    const schema = input.schema || null;

    const checks = [
      check("title", Boolean(page.title || content.title), 15, "Ajouter un titre SEO."),
      check("keyword", Boolean(page.keyword), 10, "Définir un mot-clé principal."),
      check("introduction", textLength(content.introduction) >= 80, 10, "Enrichir l'introduction."),
      check("sections", Array.isArray(content.sections) && content.sections.length >= 2, 15, "Ajouter au moins deux sections."),
      check("contentLength", totalWords(content) >= 120, 15, "Développer le contenu."),
      check("faq", Array.isArray(content.faq) && content.faq.length >= 1, 10, "Ajouter une FAQ."),
      check("internalLinks", Array.isArray(links) && links.length >= 2, 10, "Ajouter des liens internes."),
      check("schema", Boolean(schema && schema["@graph"]), 10, "Générer les données structurées."),
      check("cta", Boolean(content.callToAction), 5, "Ajouter un appel à l'action.")
    ];

    const score = checks.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
    const recommendations = checks.filter(item => !item.passed).map(item => item.recommendation);

    const result = {
      score,
      grade: grade(score),
      passed: checks.filter(item => item.passed).length,
      total: checks.length,
      checks,
      recommendations
    };

    sdk.events.publish("seo.page.scored", {
      path: page.path,
      score,
      grade: result.grade
    });

    return result;
  }

  return { score };
}

function check(id, passed, weight, recommendation) {
  return { id, passed, weight, recommendation };
}

function textLength(value) {
  return String(value || "").trim().length;
}

function totalWords(content) {
  const parts = [
    content.title,
    content.introduction,
    ...(content.sections || []).flatMap(section => [section.heading, section.body]),
    ...(content.faq || []).flatMap(item => [item.question, item.answer]),
    content.callToAction
  ];
  return parts.join(" ").trim().split(/\s+/).filter(Boolean).length;
}

function grade(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

module.exports = { create, totalWords, grade };
