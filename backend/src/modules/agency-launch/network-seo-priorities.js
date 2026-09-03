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

const LEARNING_BONUS_CAP = 12;

function learningGroupForAction(action, learning) {
  const groups = Array.isArray(learning?.groups) ? learning.groups : [];
  return groups.find(
    (group) => group?.source === action?.source && group?.code === action?.code
  ) || null;
}

function learningBonus(action, learning) {
  const group = learningGroupForAction(action, learning);
  if (!group) return 0;
  if (group.confidence !== "medium" || Number(group.samples || 0) < 5) return 0;

  const rate = Math.max(0, Math.min(Number(group.improvementRate || 0), 1));
  const delta = Math.max(0, Math.min(Number(group.averageDelta || 0), 10));
  const raw = rate * 8 + delta * 0.4;
  return Math.round(Math.min(raw, LEARNING_BONUS_CAP) * 10) / 10;
}

function scoreBreakdown(action, learning) {
  const priorityScore = PRIORITY_WEIGHT[action?.priority] || 0;
  const sourceScore = SOURCE_BONUS[action?.source] || 0;
  const group = learningGroupForAction(action, learning);
  const bonus = learningBonus(action, learning);
  return {
    priorityScore,
    sourceScore,
    baseScore: priorityScore + sourceScore,
    learningBonus: bonus,
    finalScore: priorityScore + sourceScore + bonus,
    learning: group
      ? {
          confidence: group.confidence || "insufficient",
          samples: Number(group.samples || 0),
          improvementRate: Number(group.improvementRate || 0),
          averageDelta: Number(group.averageDelta || 0),
          applied: bonus > 0,
        }
      : {
          confidence: "insufficient",
          samples: 0,
          improvementRate: 0,
          averageDelta: 0,
          applied: false,
        },
  };
}

function opportunityScore(action, learning) {
  return scoreBreakdown(action, learning).finalScore;
}

function networkSeoPriorities(items = [], limit = 25, learning = null) {
  const actions = [];

  for (const item of items || []) {
    const agency = item?.agency || {};
    const queue = Array.isArray(item?.seoActions?.actions) ? item.seoActions.actions : [];

    for (const seoAction of queue) {
      const scoring = scoreBreakdown(seoAction, learning);
      actions.push({
        ...seoAction,
        agency: {
          id: agency.id || null,
          name: agency.name || null,
          city: agency.city || null,
        },
        scoring,
        learningBonus: scoring.learningBonus,
        opportunityScore: scoring.finalScore,
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
    version: "1.2",
    total: actions.length,
    highPriority: actions.filter((item) => ["critical", "high"].includes(item.priority)).length,
    agenciesWithActions: new Set(actions.map((item) => item.agency?.id).filter(Boolean)).size,
    learningApplied: actions.some((item) => item.scoring?.learning?.applied),
    actions: actions.slice(0, safeLimit),
  };
}

module.exports = {
  PRIORITY_WEIGHT,
  SOURCE_BONUS,
  LEARNING_BONUS_CAP,
  learningGroupForAction,
  learningBonus,
  scoreBreakdown,
  opportunityScore,
  networkSeoPriorities,
};
