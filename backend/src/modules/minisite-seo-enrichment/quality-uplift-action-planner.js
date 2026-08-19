"use strict";

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function priorityScore(action = {}) {
  let score = 0;
  if (action.intentQuality) {
    score += action.intentQuality.currentStatus === "weak" ? 40 : 20;
    score += (action.intentQuality.missingSignals || []).length * 4;
  }
  if (action.thinContent) {
    score += 30;
    score += Math.min(20, Math.ceil(Number(action.thinContent.missingWords || 0) / 10));
  }
  if (action.internalLink) score += 20;
  return score;
}

function recommendedFields(action = {}) {
  const missing = action.intentQuality?.missingSignals || [];
  const fields = [];

  // Body/depth are the safest first-line uplift because they improve usefulness
  // without rewriting metadata or the page H1 when those already qualify.
  if (action.thinContent || missing.includes("body") || missing.includes("depth")) {
    fields.push("body");
  }
  if (missing.includes("title")) fields.push("title");
  if (missing.includes("meta")) fields.push("meta");
  if (missing.includes("h1")) fields.push("h1");
  if (action.internalLink) fields.push("internal-link");

  return unique(fields);
}

function changePolicy(action = {}) {
  const fields = recommendedFields(action);
  return {
    preserveManualCopy: true,
    appendOrEnrichBody: fields.includes("body"),
    rewriteTitleOnlyIfMissingSignal: fields.includes("title"),
    rewriteMetaOnlyIfMissingSignal: fields.includes("meta"),
    rewriteH1OnlyIfMissingSignal: fields.includes("h1"),
    addInternalLinkOnlyIfMissing: fields.includes("internal-link"),
  };
}

function consolidateQualityUpliftActions(plan = {}) {
  const byPage = new Map();

  function row(pageSlug) {
    const key = String(pageSlug || "home").trim() || "home";
    if (!byPage.has(key)) {
      byPage.set(key, {
        pageSlug: key,
        intentQuality: null,
        thinContent: null,
        internalLink: null,
      });
    }
    return byPage.get(key);
  }

  for (const opportunity of plan.intentOpportunities || []) {
    row(opportunity.pageSlug).intentQuality = opportunity;
  }
  for (const opportunity of plan.thinContentOpportunities || []) {
    row(opportunity.pageSlug).thinContent = opportunity;
  }
  for (const opportunity of plan.internalLinkOpportunities || []) {
    row(opportunity.pageSlug).internalLink = opportunity;
  }

  const actions = [...byPage.values()].map((action) => {
    const fields = recommendedFields(action);
    const score = priorityScore(action);
    return {
      kind: "page-quality-uplift",
      pageSlug: action.pageSlug,
      priorityScore: score,
      priority: score >= 70 ? "high" : score >= 40 ? "medium" : "low",
      recommendedFields: fields,
      changePolicy: changePolicy(action),
      intentQuality: action.intentQuality,
      thinContent: action.thinContent,
      internalLink: action.internalLink,
      suggestedSourceSlugs: unique(action.internalLink?.suggestedSourceSlugs || []),
    };
  }).sort((left, right) => {
    if (right.priorityScore !== left.priorityScore) {
      return right.priorityScore - left.priorityScore;
    }
    return left.pageSlug.localeCompare(right.pageSlug, "fr");
  });

  return {
    version: "mse-25.31",
    readOnly: true,
    actionCount: actions.length,
    highPriorityCount: actions.filter((action) => action.priority === "high").length,
    mediumPriorityCount: actions.filter((action) => action.priority === "medium").length,
    lowPriorityCount: actions.filter((action) => action.priority === "low").length,
    actions,
  };
}

module.exports = {
  changePolicy,
  consolidateQualityUpliftActions,
  priorityScore,
  recommendedFields,
  unique,
};
