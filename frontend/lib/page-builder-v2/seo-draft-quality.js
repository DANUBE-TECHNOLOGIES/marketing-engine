"use strict";

function clean(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pageText(page) {
  const chunks = [page?.title, page?.seoTitle, page?.seoDescription];
  for (const block of page?.blocks || []) {
    const content = block?.content || {};
    chunks.push(
      content.title,
      content.subtitle,
      content.text,
      content.introduction,
      content.html
    );
    for (const item of content.items || []) {
      chunks.push(item?.title, item?.text, item?.question, item?.answer);
    }
  }
  return clean(chunks.filter(Boolean).join(" "));
}

function words(value) {
  return clean(value).split(/\s+/).filter(Boolean);
}

function auditSeoDraft(page, brief = {}) {
  const checks = [];
  const h1 = clean(brief?.proposedH1 || page?.title);
  const title = clean(page?.seoTitle);
  const description = clean(page?.seoDescription);
  const text = pageText(page);
  const wordCount = words(text).length;
  const draftBlocks = (page?.blocks || []).filter(
    (block) => block?.status === "draft"
  );
  const proofRequirements = Array.isArray(brief?.localProofsRequired)
    ? brief.localProofsRequired.filter(Boolean)
    : [];

  const add = (code, passed, severity, label, detail) => {
    checks.push({ code, passed: Boolean(passed), severity, label, detail });
  };

  add("H1", h1.length >= 15, "blocker", "H1 exploitable", h1 ? `${h1.length} caractères.` : "H1 absent.");
  add("SEO_TITLE", title.length >= 30 && title.length <= 70, "blocker", "Title SEO", title ? `${title.length} caractères.` : "Title SEO absent.");
  add("META_DESCRIPTION", description.length >= 90 && description.length <= 165, "warning", "Meta description", description ? `${description.length} caractères.` : "Meta description absente.");
  add("CONTENT_DEPTH", wordCount >= 250, "blocker", "Profondeur éditoriale", `${wordCount} mots détectés ; cible minimale 250.`);
  add("BLOCKS", (page?.blocks || []).length >= 3, "warning", "Structure de page", `${(page?.blocks || []).length} bloc(s) présents.`);
  add("NO_PLACEHOLDERS", !/à rédiger|objectif éditorial|à préciser/i.test(text), "blocker", "Contenu finalisé", "Les marqueurs de brouillon doivent être remplacés avant publication.");
  add("LOCAL_PROOFS", proofRequirements.length === 0 || wordCount >= 350, "warning", "Preuves locales", proofRequirements.length ? `${proofRequirements.length} preuve(s) locale(s) demandée(s) par le brief.` : "Aucune preuve locale spécifique demandée.");
  add("DRAFT_BLOCKS", draftBlocks.length === 0, "blocker", "Statut des blocs", `${draftBlocks.length} bloc(s) encore en brouillon.`);

  const blockers = checks.filter((check) => !check.passed && check.severity === "blocker");
  const warnings = checks.filter((check) => !check.passed && check.severity === "warning");
  const passed = checks.filter((check) => check.passed).length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    version: "1.0",
    score,
    ready: blockers.length === 0,
    blockers,
    warnings,
    checks,
    metrics: {
      wordCount,
      blockCount: (page?.blocks || []).length,
      draftBlockCount: draftBlocks.length,
    },
    note: blockers.length
      ? "Publication déconseillée : au moins un contrôle critique est en échec."
      : warnings.length
        ? "Aucun blocage critique, mais des optimisations restent recommandées."
        : "Le brouillon satisfait les contrôles éditoriaux locaux de base.",
  };
}

export { auditSeoDraft, pageText };
