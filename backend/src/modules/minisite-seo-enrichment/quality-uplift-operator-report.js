"use strict";

const SIMULATED_OPERATION_TYPES = new Set([
  "enrich-body",
  "add-internal-link",
  "strengthen-title",
  "strengthen-meta-description",
  "strengthen-h1",
]);

function operationTypes(proposal = {}) {
  return Array.from(new Set((proposal.operations || []).map((operation) => operation?.type).filter(Boolean)));
}

function operatorRows(networkPreview = {}) {
  const rows = [];

  for (const agency of networkPreview.agencies || []) {
    const actionsBySlug = new Map((agency.actions || []).map((action) => [String(action.pageSlug || "home"), action]));
    const proposalsBySlug = new Map((agency.proposals || []).map((proposal) => [String(proposal.pageSlug || "home"), proposal]));
    const impactBySlug = new Map((agency.impact?.pages || []).map((page) => [String(page.pageSlug || "home"), page]));
    const slugs = new Set([...actionsBySlug.keys(), ...proposalsBySlug.keys(), ...impactBySlug.keys()]);

    for (const pageSlug of slugs) {
      const action = actionsBySlug.get(pageSlug) || {};
      const proposal = proposalsBySlug.get(pageSlug) || {};
      const impact = impactBySlug.get(pageSlug) || {};
      const types = operationTypes(proposal);
      const nonSimulated = Array.from(new Set([
        ...(impact.nonSimulatedOperationTypes || []),
        ...types.filter((type) => !SIMULATED_OPERATION_TYPES.has(type)),
      ]));
      const simulationReady = nonSimulated.length === 0 && impact.projectionComplete !== false;

      rows.push({
        agencyId: agency.agencyId || null,
        siteSlug: agency.siteSlug || null,
        city: agency.city || null,
        pageSlug,
        priority: action.priority || "low",
        priorityScore: Number(action.priorityScore || 0),
        recommendedFields: action.recommendedFields || [],
        operationTypes: types,
        bodyCopyPreviewAvailable: Boolean(proposal.bodyCopyPreview),
        beforeWarnings: Number(impact.beforeWarnings || 0),
        projectedWarnings: Number(impact.projectedWarnings || 0),
        projectedReduction: Number(impact.projectedReduction || 0),
        resolvedKinds: impact.resolvedKinds || [],
        projectionComplete: impact.projectionComplete !== false,
        executionClass: simulationReady ? "simulation-ready" : "manual-review-needed",
        manualReviewReasons: nonSimulated,
      });
    }
  }

  return rows.sort((left, right) => {
    if (right.priorityScore !== left.priorityScore) return right.priorityScore - left.priorityScore;
    if (right.projectedReduction !== left.projectedReduction) return right.projectedReduction - left.projectedReduction;
    const site = String(left.siteSlug || "").localeCompare(String(right.siteSlug || ""), "fr");
    if (site !== 0) return site;
    return String(left.pageSlug || "").localeCompare(String(right.pageSlug || ""), "fr");
  });
}

function buildQualityUpliftOperatorReport(networkPreview = {}) {
  const rows = operatorRows(networkPreview);
  const simulationReady = rows.filter((row) => row.executionClass === "simulation-ready");
  const manualReviewNeeded = rows.filter((row) => row.executionClass === "manual-review-needed");

  return {
    version: "mse-25.31",
    operation: "quality-uplift-operator-report",
    readOnly: true,
    writes: false,
    destructive: false,
    summary: {
      pageCount: rows.length,
      simulationReadyCount: simulationReady.length,
      manualReviewNeededCount: manualReviewNeeded.length,
      highPriorityCount: rows.filter((row) => row.priority === "high").length,
      projectedWarningReduction: rows.reduce((sum, row) => sum + row.projectedReduction, 0),
    },
    rows,
    simulationReady,
    manualReviewNeeded,
  };
}

module.exports = {
  SIMULATED_OPERATION_TYPES,
  buildQualityUpliftOperatorReport,
  operationTypes,
  operatorRows,
};
