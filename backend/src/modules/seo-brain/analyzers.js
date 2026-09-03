"use strict";

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return String(value);
}

function words(value) {
  return textOf(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) || [];
}

function analyzePage(page) {
  const body = page.sections.map(s => textOf(s.jsonContent)).join(" ");
  const wordCount = words(body).length;
  const titleLength = (page.seoTitle || "").trim().length;
  const metaLength = (page.metaDescription || "").trim().length;
  const h1Count = page.h1 && page.h1.trim() ? 1 : 0;
  const faqCount = page.sections.filter(s => /faq/i.test(s.sectionType)).length;
  const linkCount = (body.match(/https?:\/\/|href\s*[:=]/gi) || []).length;

  const checks = [
    { key: "title", ok: titleLength >= 35 && titleLength <= 65, impact: 14, message: "Optimiser le title entre 35 et 65 caractères." },
    { key: "meta", ok: metaLength >= 120 && metaLength <= 165, impact: 12, message: "Optimiser la meta description entre 120 et 165 caractères." },
    { key: "h1", ok: h1Count === 1, impact: 14, message: "Ajouter un H1 unique et descriptif." },
    { key: "content", ok: wordCount >= 500, impact: 22, message: "Enrichir le contenu pour atteindre au moins 500 mots utiles." },
    { key: "sections", ok: page.sections.length >= 4, impact: 10, message: "Structurer la page avec au moins quatre sections." },
    { key: "faq", ok: faqCount > 0, impact: 10, message: "Ajouter une FAQ orientée intentions de recherche." },
    { key: "links", ok: linkCount >= 3, impact: 10, message: "Ajouter au moins trois liens internes contextuels." },
    { key: "schema", ok: Boolean(page.schemaType), impact: 8, message: "Définir un type Schema.org adapté." }
  ];
  const score = checks.reduce((sum, c) => sum + (c.ok ? c.impact : 0), 0);
  return { score, wordCount, titleLength, metaLength, faqCount, linkCount, checks };
}

function overlap(a, b) {
  const aa = new Set(words(a));
  const bb = new Set(words(b));
  if (!aa.size || !bb.size) return 0;
  let common = 0;
  for (const item of aa) if (bb.has(item)) common++;
  return common / Math.max(aa.size, bb.size);
}

module.exports = { analyzePage, overlap, textOf, words };
