"use strict";

const WEIGHTS = {
  visibility: 30,
  freshness: 15,
  citations: 15,
  trust: 15,
  content: 15,
  trend: 10,
};

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function component(code, label, weight, ratio, detail) {
  const normalized = clamp01(ratio);
  return {
    code,
    label,
    weight,
    ratio: Math.round(normalized * 1000) / 1000,
    points: Math.round(weight * normalized * 10) / 10,
    detail,
  };
}

function seoHealthScore(report) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  const byCode = new Map(checks.map((item) => [item?.code, item]));
  const rankings = byCode.get("LOCAL_RANKINGS") || {};
  const citations = byCode.get("LOCAL_CITATIONS") || {};
  const trust = byCode.get("LOCAL_TRUST") || {};
  const localContent = byCode.get("LOCAL_CONTENT") || {};
  const similarity = byCode.get("CONTENT_SIMILARITY") || {};

  const visibilityRatio = Number(rankings.top10Rate || 0) * 0.7 + Number(rankings.top20Rate || 0) * 0.3;
  const freshnessRatio = rankings.activeKeywords > 0 ? Number(rankings.freshKeywords || 0) / Number(rankings.activeKeywords || 1) : 0;
  const citationsRatio = Number.isFinite(Number(citations.consistencyRate)) ? Number(citations.consistencyRate) : (citations.passed ? 1 : 0);

  const reviewCount = Number(trust.reviewCount || 0);
  const responseRate = Number(trust.responseRate || 0);
  const freshReview = trust.latestAgeDays != null && trust.freshnessTargetDays
    ? Math.max(0, 1 - Number(trust.latestAgeDays) / Math.max(1, Number(trust.freshnessTargetDays) * 2))
    : 0;
  const trustRatio = Math.min(1, reviewCount / 20) * 0.4 + clamp01(responseRate) * 0.3 + freshReview * 0.3;

  const contentRatio = (localContent.passed ? 0.6 : 0.2) + (similarity.passed === false ? 0 : 0.4);

  const trend30 = rankings.visibilityTrend?.windows?.find((item) => item.days === 30);
  const trendRatio = !trend30?.comparable
    ? 0.5
    : trend30.top10Delta > 0
      ? 1
      : trend30.top10Delta < 0
        ? 0
        : trend30.top20Delta > 0
          ? 0.75
          : trend30.top20Delta < 0
            ? 0.25
            : 0.5;

  const components = [
    component("visibility", "Visibilité locale", WEIGHTS.visibility, visibilityRatio, `${rankings.top10Keywords || 0} Top 10 / ${rankings.top20Keywords || 0} Top 20`),
    component("freshness", "Fraîcheur des rankings", WEIGHTS.freshness, freshnessRatio, `${rankings.freshKeywords || 0}/${rankings.activeKeywords || 0} mots-clés frais`),
    component("citations", "Cohérence des citations", WEIGHTS.citations, citationsRatio, `${Math.round(citationsRatio * 100)} % cohérentes`),
    component("trust", "Confiance locale", WEIGHTS.trust, trustRatio, `${reviewCount} avis suivis`),
    component("content", "Qualité éditoriale locale", WEIGHTS.content, contentRatio, similarity.passed === false ? "Similarité inter-agences détectée" : "Contenu local distinct"),
    component("trend", "Tendance récente", WEIGHTS.trend, trendRatio, trend30?.comparable ? `Top 10 ${trend30.top10Delta >= 0 ? "+" : ""}${trend30.top10Delta} sur 30 jours` : "Historique 30 jours insuffisant"),
  ];

  const score = Math.round(components.reduce((sum, item) => sum + item.points, 0));
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "E";

  return {
    version: "1.0",
    score,
    grade,
    status: score >= 70 ? "healthy" : score >= 50 ? "watch" : "priority",
    components,
    disclaimer: "Score opérationnel interne distinct de la readiness de publication et non équivalent à un score officiel Google.",
  };
}

function applySeoHealthScore(report) {
  return {
    ...report,
    version: "3.7",
    seoHealth: seoHealthScore(report),
  };
}

module.exports = { WEIGHTS, clamp01, component, seoHealthScore, applySeoHealthScore };
