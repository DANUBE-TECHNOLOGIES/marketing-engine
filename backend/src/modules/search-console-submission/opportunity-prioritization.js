"use strict";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function impressionPoints(impressions) {
  const value = asNumber(impressions);
  if (value >= 200) return 50;
  if (value >= 100) return 42;
  if (value >= 50) return 32;
  if (value >= 20) return 20;
  return 0;
}

function positionPoints(position) {
  const value = asNumber(position);
  if (value >= 4 && value <= 10) return 30;
  if (value > 10 && value <= 15) return 22;
  if (value > 15 && value <= 20) return 14;
  return 0;
}

function ctrPoints(ctr) {
  const value = asNumber(ctr);
  if (value < 0.02) return 20;
  if (value < 0.05) return 12;
  return 5;
}

function priorityBand(score) {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "watch";
}

function recommendedAction(row) {
  const position = asNumber(row?.position);
  const ctr = asNumber(row?.ctr);

  if (position >= 4 && position <= 10 && ctr < 0.05) {
    return {
      code: "snippet",
      label: "Optimiser le snippet",
      rationale: "La requête est déjà proche du haut de page mais son CTR laisse un potentiel de clic : travailler title, meta description et promesse locale.",
    };
  }

  if (position > 10 && position <= 20) {
    return {
      code: "content-and-links",
      label: "Renforcer contenu et maillage",
      rationale: "La requête est visible mais encore hors du premier écran : enrichir le contenu local et créer des liens internes contextuels vers la page cible.",
    };
  }

  return {
    code: "consolidate",
    label: "Consolider la page",
    rationale: "La visibilité existe déjà : consolider la pertinence locale et surveiller l’évolution avant une modification plus importante.",
  };
}

function prioritizeSearchOpportunities(rows, { limit = 20 } = {}) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => {
      const impressions = asNumber(row?.impressions);
      const position = asNumber(row?.position);
      return impressions >= 20 && position >= 4 && position <= 20 && row?.dimensions?.query;
    })
    .map((row) => {
      const breakdown = {
        impressions: impressionPoints(row.impressions),
        position: positionPoints(row.position),
        ctr: ctrPoints(row.ctr),
      };
      const score = breakdown.impressions + breakdown.position + breakdown.ctr;
      return {
        query: row.dimensions.query,
        clicks: asNumber(row.clicks),
        impressions: asNumber(row.impressions),
        ctr: asNumber(row.ctr),
        position: asNumber(row.position),
        score,
        priority: priorityBand(score),
        scoreBreakdown: breakdown,
        action: recommendedAction(row),
      };
    })
    .sort((left, right) => right.score - left.score || right.impressions - left.impressions || left.position - right.position)
    .slice(0, Math.max(1, Math.min(100, Number(limit || 20))));
}

module.exports = {
  ctrPoints,
  impressionPoints,
  positionPoints,
  prioritizeSearchOpportunities,
  priorityBand,
  recommendedAction,
};
