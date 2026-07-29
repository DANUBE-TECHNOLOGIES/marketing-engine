"use strict";

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };

function actionPriority(score) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function buildRecommendations({ siteReport, opportunities = [], campaigns = [] }) {
  const recommendations = [];

  for (const action of siteReport.priorities || []) {
    recommendations.push({
      ...action,
      id: `${action.type}:${action.targetPageId || action.code}`,
      source: "page_audit",
      score: Math.min(100, (action.estimatedGain || 0) * 6),
      priority: action.priority || actionPriority((action.estimatedGain || 0) * 6)
    });
  }

  for (const opportunity of opportunities) {
    recommendations.push({
      ...opportunity,
      id: `destination:${opportunity.destinationId}`,
      source: "destination_coverage",
      priority: actionPriority(opportunity.score)
    });
  }

  const futureCampaigns = campaigns.filter((c) => c.scheduledAt && new Date(c.scheduledAt) > new Date()).length;
  if (futureCampaigns < 3) {
    recommendations.push({
      id: "marketing:calendar-gap",
      type: "editorial_calendar",
      source: "marketing_activity",
      title: "Planifier au moins trois publications à venir",
      rationale: "Le calendrier éditorial ne couvre pas suffisamment les prochaines semaines.",
      score: futureCampaigns === 0 ? 85 : 65,
      priority: futureCampaigns === 0 ? "critical" : "medium",
      autoExecutable: true
    });
  }

  return recommendations
    .sort((a, b) => (PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]) || ((b.score || 0) - (a.score || 0)))
    .slice(0, 50);
}

module.exports = { actionPriority, buildRecommendations };
