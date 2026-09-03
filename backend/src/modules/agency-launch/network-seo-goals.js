"use strict";

function networkSeoGoals(items = []) {
  const agencies = (items || []).filter((item) => item?.agency?.id && item?.seoGoals?.primary);
  const rows = agencies.map((item) => {
    const primary = item.seoGoals.primary || {};
    const keywordGoals = Array.isArray(item.seoGoals.keywords) ? item.seoGoals.keywords : [];
    const gap = Math.max(0, Number(primary.remaining || 0));
    const nearest = keywordGoals
      .filter((goal) => Number.isFinite(Number(goal.currentPosition)))
      .sort((left, right) => Number(left.remainingPositions || 999) - Number(right.remainingPositions || 999))[0] || null;

    return {
      agency: item.agency,
      currentTop10: Number(primary.current || 0),
      targetTop10: Number(primary.target || 0),
      remainingTop10: gap,
      progress: Number(primary.progress || 0),
      opportunityKeywords: keywordGoals.length,
      nearestOpportunity: nearest,
      potentialScore: gap * 20 + keywordGoals.length * 5 + (nearest ? Math.max(0, 11 - Number(nearest.remainingPositions || 0)) : 0),
    };
  });

  const currentTop10 = rows.reduce((sum, row) => sum + row.currentTop10, 0);
  const targetTop10 = rows.reduce((sum, row) => sum + row.targetTop10, 0);
  const remainingTop10 = Math.max(0, targetTop10 - currentTop10);
  const opportunityKeywords = rows.reduce((sum, row) => sum + row.opportunityKeywords, 0);

  const priorityAgencies = rows
    .filter((row) => row.remainingTop10 > 0 || row.opportunityKeywords > 0)
    .sort((left, right) => {
      if (right.potentialScore !== left.potentialScore) return right.potentialScore - left.potentialScore;
      if (right.remainingTop10 !== left.remainingTop10) return right.remainingTop10 - left.remainingTop10;
      return String(left.agency?.city || "").localeCompare(String(right.agency?.city || ""), "fr");
    })
    .slice(0, 10);

  return {
    version: "1.0",
    agenciesObserved: rows.length,
    currentTop10,
    targetTop10,
    remainingTop10,
    progress: targetTop10 > 0 ? Math.round((currentTop10 / targetTop10) * 1000) / 10 : 0,
    opportunityKeywords,
    agenciesWithPotential: priorityAgencies.length,
    priorityAgencies,
  };
}

module.exports = {
  networkSeoGoals,
};
