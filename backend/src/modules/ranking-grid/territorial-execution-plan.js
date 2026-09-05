"use strict";

const ACTION_PROFILES = Object.freeze({
  service_area_relevance: { impact: 6, effort: 1, label: "Renforcer la pertinence de zone de service" },
  internal_linking: { impact: 5, effort: 1, label: "Renforcer le maillage interne local" },
  local_proof: { impact: 5, effort: 2, label: "Ajouter des preuves locales réelles" },
  local_mentions: { impact: 4, effort: 3, label: "Obtenir des mentions locales légitimes" },
  editorial_activation: { impact: 3, effort: 3, label: "Activer un contenu éditorial local utile" },
  review_signal: { impact: 2, effort: 2, label: "Développer le signal d'avis clients réels" },
});

const URGENCY_WEIGHT = Object.freeze({ critical: 4, high: 3, medium: 2, monitor: 1 });

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function executionScore(territory = {}, action = {}) {
  const urgency = URGENCY_WEIGHT[territory.urgency] || 0;
  const territoryScore = Number(territory.score) || 0;
  const profile = ACTION_PROFILES[action.code] || { impact: 1, effort: 3, label: action.code || "action" };
  return round((urgency * 100) + (territoryScore * 4) + (profile.impact * 10) - (profile.effort * 3), 2);
}

function candidate(territory, action) {
  const profile = ACTION_PROFILES[action.code] || { impact: 1, effort: 3, label: action.code || "action" };
  return {
    city: territory.city,
    urgency: territory.urgency,
    territoryScore: territory.score,
    actionCode: action.code,
    actionType: action.type,
    action: action.action,
    label: profile.label,
    impact: profile.impact,
    effort: profile.effort,
    score: executionScore(territory, action),
  };
}

function sortCandidates(rows) {
  return [...rows].sort((a, b) => b.score - a.score
    || b.impact - a.impact
    || a.effort - b.effort
    || a.city.localeCompare(b.city)
    || a.actionCode.localeCompare(b.actionCode));
}

function buildTerritorialExecutionPlan(plan = {}) {
  const territories = Array.isArray(plan.territories) ? plan.territories : [];
  const byCity = new Map();
  const all = [];

  for (const territory of territories) {
    const rows = sortCandidates((territory.actions || []).map((action) => candidate(territory, action)));
    byCity.set(territory.city, rows);
    all.push(...rows);
  }

  const wave1 = [];
  for (const territory of territories.filter((row) => row.urgency === "critical")) {
    wave1.push(...(byCity.get(territory.city) || []).slice(0, 2));
  }
  const firstWave = sortCandidates(wave1).slice(0, 8);
  const wave1Keys = new Set(firstWave.map((row) => `${row.city}:${row.actionCode}`));

  const wave2Seed = [];
  for (const territory of territories.filter((row) => row.urgency === "high")) {
    const first = (byCity.get(territory.city) || [])[0];
    if (first) wave2Seed.push(first);
  }

  const remaining = sortCandidates(all.filter((row) => !wave1Keys.has(`${row.city}:${row.actionCode}`)
    && !wave2Seed.some((seed) => seed.city === row.city && seed.actionCode === row.actionCode)));
  const secondWave = sortCandidates([...wave2Seed, ...remaining.slice(0, Math.max(0, 8 - wave2Seed.length))]).slice(0, 8);
  const wave2Keys = new Set(secondWave.map((row) => `${row.city}:${row.actionCode}`));
  const backlog = sortCandidates(all.filter((row) => !wave1Keys.has(`${row.city}:${row.actionCode}`)
    && !wave2Keys.has(`${row.city}:${row.actionCode}`)));

  return {
    mode: "read_only",
    databaseWrites: 0,
    providerCalls: 0,
    externalCalls: 0,
    rationale: "Wave 1 takes the two highest-impact/lowest-effort recommendations for each critical territory; Wave 2 seeds every high-priority territory before filling remaining capacity.",
    summary: {
      wave1: firstWave.length,
      wave2: secondWave.length,
      backlog: backlog.length,
      total: all.length,
    },
    wave1: firstWave,
    wave2: secondWave,
    backlog,
  };
}

module.exports = {
  ACTION_PROFILES,
  executionScore,
  buildTerritorialExecutionPlan,
};
