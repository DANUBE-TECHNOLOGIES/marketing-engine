"use strict";

function operationForField(field, action = {}) {
  if (field === "body") {
    return {
      type: "enrich-body",
      strategy: "append-or-enrich-existing-editorial-copy",
      preserveExisting: true,
      targetMinimumWords: Number(action.thinContent?.minimumWords || 120),
      missingWords: Number(action.thinContent?.missingWords || 0),
    };
  }
  if (field === "internal-link") {
    return {
      type: "add-internal-link",
      strategy: "add-contextual-link-from-existing-published-page",
      preserveExisting: true,
      suggestedSourceSlugs: [...(action.suggestedSourceSlugs || [])],
    };
  }
  if (field === "title") {
    return {
      type: "strengthen-title",
      strategy: "rewrite-only-because-quality-signal-is-missing",
      preserveExisting: false,
    };
  }
  if (field === "meta") {
    return {
      type: "strengthen-meta-description",
      strategy: "rewrite-only-because-quality-signal-is-missing",
      preserveExisting: false,
    };
  }
  if (field === "h1") {
    return {
      type: "strengthen-h1",
      strategy: "rewrite-only-because-quality-signal-is-missing",
      preserveExisting: false,
    };
  }
  return null;
}

function proposalForAction(action = {}) {
  const operations = (action.recommendedFields || [])
    .map((field) => operationForField(field, action))
    .filter(Boolean);

  return {
    kind: "page-quality-uplift-proposal",
    pageSlug: action.pageSlug || "home",
    priority: action.priority || "low",
    priorityScore: Number(action.priorityScore || 0),
    readOnly: true,
    writes: false,
    requiresExplicitApply: true,
    operations,
    safeguards: {
      preserveManualCopy: action.changePolicy?.preserveManualCopy !== false,
      metadataRewriteAllowed: operations.some((item) =>
        ["strengthen-title", "strengthen-meta-description"].includes(item.type)
      ),
      h1RewriteAllowed: operations.some((item) => item.type === "strengthen-h1"),
      bodyAppendPreferred: operations.some((item) => item.type === "enrich-body"),
      internalLinkOnlyIfMissing: operations.some((item) => item.type === "add-internal-link"),
    },
    diagnostics: {
      intentQuality: action.intentQuality || null,
      thinContent: action.thinContent || null,
      internalLink: action.internalLink || null,
    },
  };
}

function buildQualityUpliftProposal(actionPlan = {}) {
  const actions = Array.isArray(actionPlan.actions) ? actionPlan.actions : [];
  const proposals = actions.map(proposalForAction);
  const operationCount = proposals.reduce(
    (sum, proposal) => sum + proposal.operations.length,
    0
  );

  return {
    version: "mse-25.31",
    operation: "preview-quality-uplift-proposal",
    readOnly: true,
    writes: false,
    destructive: false,
    proposalCount: proposals.length,
    operationCount,
    proposals,
  };
}

module.exports = {
  buildQualityUpliftProposal,
  operationForField,
  proposalForAction,
};
