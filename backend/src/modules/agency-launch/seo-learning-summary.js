"use strict";

function matureObservation(impact) {
  const windows = Array.isArray(impact?.windows) ? impact.windows : [];
  return [...windows]
    .filter((window) => window?.delta != null && window?.result)
    .sort((left, right) => right.days - left.days)[0] || null;
}

function actionEffectiveness(action, impact) {
  const observation = matureObservation(impact);
  if (!observation) return null;
  return {
    actionId: action.id || null,
    source: action.source || "UNKNOWN",
    code: action.code || "UNKNOWN",
    priority: action.priority || null,
    keyword: action.keyword || null,
    daysObserved: observation.days,
    delta: observation.delta,
    observation: observation.observation,
  };
}

function aggregateEffectiveness(samples = []) {
  const groups = new Map();
  for (const sample of samples.filter(Boolean)) {
    const key = `${sample.source}::${sample.code}`;
    if (!groups.has(key)) {
      groups.set(key, {
        source: sample.source,
        code: sample.code,
        samples: 0,
        improved: 0,
        stable: 0,
        declined: 0,
        totalDelta: 0,
      });
    }
    const group = groups.get(key);
    group.samples += 1;
    group.totalDelta += Number(sample.delta || 0);
    if (sample.observation === "improved") group.improved += 1;
    else if (sample.observation === "declined") group.declined += 1;
    else group.stable += 1;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      averageDelta: Math.round((group.totalDelta / group.samples) * 10) / 10,
      improvementRate: Math.round((group.improved / group.samples) * 1000) / 1000,
      confidence: group.samples >= 5 ? "medium" : group.samples >= 3 ? "low" : "insufficient",
    }))
    .sort((left, right) => {
      if (right.improvementRate !== left.improvementRate) return right.improvementRate - left.improvementRate;
      if (right.averageDelta !== left.averageDelta) return right.averageDelta - left.averageDelta;
      return right.samples - left.samples;
    });
}

function seoLearningSummary(actions = [], impacts = []) {
  const impactByAction = new Map((impacts || []).map((impact) => [impact.actionId, impact]));
  const samples = (actions || [])
    .map((action) => actionEffectiveness(action, impactByAction.get(action.id)))
    .filter(Boolean);
  const groups = aggregateEffectiveness(samples);

  return {
    version: "1.0",
    measuredActions: samples.length,
    improvedActions: samples.filter((item) => item.observation === "improved").length,
    declinedActions: samples.filter((item) => item.observation === "declined").length,
    groups,
    disclaimer: "Synthèse de corrélations observées après des actions SEO. Les échantillons faibles ne doivent pas être interprétés comme une preuve causale.",
  };
}

module.exports = {
  matureObservation,
  actionEffectiveness,
  aggregateEffectiveness,
  seoLearningSummary,
};
