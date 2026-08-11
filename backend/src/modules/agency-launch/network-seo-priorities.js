"use strict";

const PRIORITY_WEIGHT = {
  critical: 100,
  high: 70,
  medium: 40,
  low: 15,
};

const SOURCE_BONUS = {
  LOCAL_RANKINGS: 20,
  LOCAL_CITATIONS: 18,
  LOCAL_SEO: 16,
  CONTENT_SIMILARITY: 14,
  LOCAL_TRUST: 10,
  LOCAL_CONTENT: 8,
};

function opportunityScore(action) {
  return (PRIORITY_WEIGHT[action?.priority] || 0) + (SOURCE_BONUS[action?.source] || 0);
}

function networkSeoPriorities(items = [], limit = 25) {
  const actions = [];

  for (const item of items || []) {
    const agency = item?.agency || {};
    const queue = Array.isArray(item?.seoActions?.actions) ? item.seoActions.actions : [];

    for (const seoAction of queue) {
      actions.push({
        ...seoAction,
        agency: {
          id: agency.id || null,
          name: agency.name || null,
          city: agency.city || null,
        },
        opportunityScore: opportunityScore(seoAction),
      });
    }
  }

  actions.sort((left, right) => {
    const scoreDelta = right.opportunityScore - left.opportunityScore;
    if (scoreDelta !== 0) return scoreDelta;
    const cityDelta = String(left.agency?.city || "").localeCompare(String(right.agency?.city || ""), "fr");
    if (cityDelta !== 0) return cityDelta;
    return String(left.title || "").localeCompare(String(right.title || ""), "fr");
  });

  const safeLimit = Math.max(1, Math.min(Number(limit) || 25, 100));
  return {
    version: "1.0",
    total: actions.length,
    highPriority: actions.filter((item) => ["critical", "high"].includes(item.priority)).length,
    agenciesWithActions: new Set(actions.map((item) => item.agency?.id).filter(Boolean)).size,
    actions: actions.slice(0, safeLimit),
  };
}

module.exports = {
  PRIORITY_WEIGHT,
  SOURCE_BONUS,
  opportunityScore,
  networkSeoPriorities,
};
