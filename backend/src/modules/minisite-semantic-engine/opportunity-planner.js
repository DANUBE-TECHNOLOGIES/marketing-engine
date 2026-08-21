"use strict";

const { INTENT_BY_KEY } = require("./catalog");

const PRIORITY_WEIGHT = Object.freeze({ high: 30, medium: 15, low: 5 });

function bounded(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function opportunityValue(row = {}, graph = {}) {
  const intent = INTENT_BY_KEY.get(row.intentKey);
  const commercialWeight = intent?.commercial ? 35 : 10;
  const intentGap = bounded((row.targetScore || 70) - (row.currentScore || 0));
  const localTarget = row.targetLocalityScore == null ? 0 : row.targetLocalityScore;
  const localityGap = localTarget ? bounded(localTarget - (row.currentLocalityScore || 0)) : 0;
  const existingPageBonus = row.pageSlug ? 18 : 0;
  const priorityWeight = PRIORITY_WEIGHT[row.priority] || 0;
  const graphBonus = graph.orphanPages?.includes(row.pageSlug) ? 8 : 0;
  const creationPenalty = row.type === "page-candidate-review" ? 22 : 0;
  const managedRoutePenalty = row.type === "managed-route-semantic-review" ? 8 : 0;
  const score = Math.round(
    commercialWeight +
    priorityWeight +
    intentGap * 0.35 +
    localityGap * 0.25 +
    existingPageBonus +
    graphBonus -
    creationPenalty -
    managedRoutePenalty
  );
  return bounded(score);
}

function actionForOpportunity(row = {}) {
  if (row.type === "managed-route-semantic-review") {
    return ["managed-route-owner-review", "managed-route-metadata-review", "no-website-designer-write"];
  }
  if (row.type === "strengthen-existing-page") {
    const operations = [];
    if (["intent-weak", "intent-absent"].includes(row.reason)) {
      operations.push("strengthen-title", "strengthen-h1", "enrich-body");
    }
    if (["locality-weak", "locality-partial"].includes(row.reason)) {
      operations.push("strengthen-local-title", "strengthen-local-h1", "strengthen-local-meta");
    }
    if (operations.length === 0) operations.push("semantic-content-review");
    operations.push("topic-linking-review");
    return [...new Set(operations)];
  }
  return ["page-necessity-review", "search-demand-evidence-required", "manual-editorial-brief"];
}

function planSemanticOpportunities(plan = {}, graph = {}) {
  const items = (plan.opportunities || []).map((row) => {
    const valueScore = opportunityValue(row, graph);
    let executionClass;
    if (row.type === "managed-route-semantic-review") executionClass = "managed-route-review";
    else if (row.type === "strengthen-existing-page") executionClass = valueScore >= 70 ? "high-value-existing-page" : "existing-page-review";
    else executionClass = "new-page-evidence-gate";

    return {
      ...row,
      valueScore,
      executionClass,
      operations: actionForOpportunity(row),
      evidenceRequired: row.type === "page-candidate-review",
      safeForAutomaticProposal: row.type === "strengthen-existing-page",
      safeForAutomaticWrite: false,
    };
  }).sort((a, b) => b.valueScore - a.valueScore || String(a.intentKey).localeCompare(String(b.intentKey), "fr"));

  return {
    items,
    summary: {
      opportunityCount: items.length,
      highValueExistingPageCount: items.filter((row) => row.executionClass === "high-value-existing-page").length,
      existingPageReviewCount: items.filter((row) => row.executionClass === "existing-page-review").length,
      managedRouteReviewCount: items.filter((row) => row.executionClass === "managed-route-review").length,
      newPageEvidenceGateCount: items.filter((row) => row.executionClass === "new-page-evidence-gate").length,
      automaticWriteCount: 0,
    },
  };
}

module.exports = { actionForOpportunity, opportunityValue, planSemanticOpportunities };
