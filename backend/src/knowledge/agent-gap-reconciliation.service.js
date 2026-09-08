"use strict";

const agentGapsService = require("./agent-knowledge-gaps.service");
const agencyKnowledgeService = require("./network-agency-knowledge.service");

function clean(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function targetSummary(target) {
  return {
    id: target.id,
    type: target.type,
    slug: target.slug,
    title: target.title,
  };
}

function reconcileExact(gaps = [], targets = []) {
  const byTitle = new Map();
  for (const target of targets) {
    const key = normalized(target?.title);
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push(targetSummary(target));
  }

  return gaps.map((gap) => {
    const key = normalized(gap?.normalizedQuery || gap?.query);
    const matches = byTitle.get(key) || [];
    return {
      ...gap,
      reconciliation: matches.length === 1
        ? { status: "exact_match", candidate: matches[0], candidates: [] }
        : matches.length > 1
          ? { status: "ambiguous_exact", candidate: null, candidates: matches }
          : { status: "unmatched", candidate: null, candidates: [] },
    };
  });
}

async function report({
  siteSlug,
  limit,
  gapLoader = agentGapsService.report,
  matrixLoader = agencyKnowledgeService.matrix,
} = {}) {
  const [gapReport, matrix] = await Promise.all([
    gapLoader({ siteSlug, limit }),
    matrixLoader(),
  ]);

  if (!gapReport || gapReport.mode !== "read-only" || gapReport.inference !== false) {
    throw new Error("Agent gap report contract rejected.");
  }
  if (!matrix || matrix.mode !== "read-only" || matrix.inference !== false || !Array.isArray(matrix.targets)) {
    throw new Error("Agency Knowledge matrix contract rejected.");
  }

  const gaps = reconcileExact(gapReport.gaps || [], matrix.targets);
  return {
    ...gapReport,
    reconciliation: {
      mode: "exact-only",
      inference: false,
      fuzzy: false,
      targetCount: matrix.targets.length,
      exactMatchCount: gaps.filter((gap) => gap.reconciliation.status === "exact_match").length,
      ambiguousExactCount: gaps.filter((gap) => gap.reconciliation.status === "ambiguous_exact").length,
      unmatchedCount: gaps.filter((gap) => gap.reconciliation.status === "unmatched").length,
    },
    gaps,
  };
}

module.exports = {
  normalized,
  reconcileExact,
  report,
};
