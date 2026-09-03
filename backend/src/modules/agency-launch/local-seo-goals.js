"use strict";

function top10Goal(check) {
  const freshKeywords = Number(check?.freshKeywords || 0);
  const current = Number(check?.top10Keywords || 0);
  if (freshKeywords <= 0) {
    return {
      code: "TOP10_COVERAGE",
      label: "Mots-clés dans le Top 10",
      current: 0,
      target: 0,
      remaining: 0,
      progress: 0,
      status: "not_applicable",
    };
  }

  const opportunityCount = Array.isArray(check?.opportunities)
    ? check.opportunities.filter((item) => item?.type === "near_top10").length
    : 0;
  const achievableGain = Math.max(1, Math.min(3, opportunityCount || 1));
  const target = Math.min(freshKeywords, current + achievableGain);
  const remaining = Math.max(0, target - current);

  return {
    code: "TOP10_COVERAGE",
    label: "Mots-clés dans le Top 10",
    current,
    target,
    remaining,
    progress: target > 0 ? Math.round((current / target) * 1000) / 10 : 0,
    status: remaining === 0 ? "achieved" : "in_progress",
  };
}

function keywordGoals(check) {
  const opportunities = Array.isArray(check?.opportunities) ? check.opportunities : [];
  return opportunities
    .filter((item) => item?.type === "near_top10" && Number.isFinite(Number(item?.position)))
    .slice(0, 5)
    .map((item) => ({
      code: "KEYWORD_TOP10",
      keywordId: item.keywordId,
      keyword: item.keyword,
      city: item.city,
      currentPosition: Number(item.position),
      targetPosition: 10,
      remainingPositions: Math.max(0, Number(item.position) - 10),
      momentum: item.momentum || null,
      status: Number(item.position) <= 10 ? "achieved" : "in_progress",
    }));
}

function localSeoGoals(check) {
  const primary = top10Goal(check);
  const keywords = keywordGoals(check);
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    primary,
    keywords,
    totalKeywordGoals: keywords.length,
    achievedKeywordGoals: keywords.filter((item) => item.status === "achieved").length,
  };
}

function applyLocalSeoGoals(report) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const rankings = checks.find((item) => item?.code === "LOCAL_RANKINGS") || null;
  return {
    ...report,
    version: "3.4",
    seoGoals: localSeoGoals(rankings),
  };
}

module.exports = {
  top10Goal,
  keywordGoals,
  localSeoGoals,
  applyLocalSeoGoals,
};
