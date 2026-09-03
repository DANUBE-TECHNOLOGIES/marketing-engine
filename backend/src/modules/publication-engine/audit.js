"use strict";

function text(value) { return String(value || "").trim(); }
function lengthRule(value, min, max) {
  const length = text(value).length;
  return { ok: length >= min && length <= max, length, min, max };
}

function auditPage(page, { baseUrl = null } = {}) {
  if (!page) throw new Error("Page requise pour l'audit SEO.");
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const types = new Set(sections.map((section) => section.sectionType || section.type));
  const checks = [
    { code: "SEO_TITLE", label: "Titre SEO entre 30 et 65 caractères", weight: 15, ...lengthRule(page.seoTitle, 30, 65) },
    { code: "META_DESCRIPTION", label: "Méta-description entre 120 et 165 caractères", weight: 15, ...lengthRule(page.metaDescription, 120, 165) },
    { code: "H1", label: "Titre H1 présent", weight: 15, ok: text(page.h1).length >= 8, length: text(page.h1).length },
    { code: "PATH", label: "Chemin canonique valide", weight: 10, ok: text(page.path).startsWith("/") && !text(page.path).includes(" ") },
    { code: "CONTENT", label: "Au moins trois sections de contenu", weight: 20, ok: sections.length >= 3, count: sections.length },
    { code: "HERO", label: "Bloc principal présent", weight: 10, ok: types.has("hero") || types.has("page-header") },
    { code: "CTA", label: "Appel à l'action présent", weight: 10, ok: types.has("contact-cta") || types.has("cta") },
    { code: "SCHEMA", label: "Type Schema.org présent", weight: 5, ok: text(page.schemaType).length > 0 },
  ];
  const possible = checks.reduce((sum, check) => sum + check.weight, 0);
  const earned = checks.reduce((sum, check) => sum + (check.ok ? check.weight : 0), 0);
  const score = Math.round((earned / possible) * 100);
  const blockers = checks.filter((check) => !check.ok && ["SEO_TITLE", "META_DESCRIPTION", "H1", "CONTENT"].includes(check.code));
  const warnings = checks.filter((check) => !check.ok && !blockers.includes(check));
  return {
    score,
    passed: blockers.length === 0,
    grade: score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "E",
    canonical: baseUrl ? `${String(baseUrl).replace(/\/$/, "")}${page.path}` : page.path,
    checks,
    blockers,
    warnings,
  };
}

module.exports = { auditPage, lengthRule };
