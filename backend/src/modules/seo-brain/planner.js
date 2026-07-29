"use strict";

function buildExecutionPlan(recommendations, options = {}) {
  const maxActions = Math.max(1, Math.min(50, Number(options.maxActions || 15)));
  const allowAuto = options.allowAuto !== false;
  const actions = recommendations.slice(0, maxActions).map((recommendation, index) => ({
    order: index + 1,
    recommendationId: recommendation.id,
    type: recommendation.type,
    title: recommendation.title,
    priority: recommendation.priority,
    mode: allowAuto && recommendation.autoExecutable ? "automatic" : "manual_review",
    status: "planned",
    targetPageId: recommendation.targetPageId || null,
    destinationSlug: recommendation.destinationSlug || null,
    estimatedGain: recommendation.estimatedGain || null
  }));
  return {
    createdAt: new Date().toISOString(),
    policy: { maxActions, allowAuto },
    summary: {
      total: actions.length,
      automatic: actions.filter((a) => a.mode === "automatic").length,
      manualReview: actions.filter((a) => a.mode === "manual_review").length
    },
    actions
  };
}

module.exports = { buildExecutionPlan };
