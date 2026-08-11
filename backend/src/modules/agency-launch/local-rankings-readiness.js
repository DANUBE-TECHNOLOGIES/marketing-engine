"use strict";

const RANKING_FRESHNESS_TARGET_DAYS = 45;

function daysSince(value, now = new Date()) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

function latestResult(keyword) {
  const results = Array.isArray(keyword?.results) ? keyword.results : [];
  return [...results]
    .sort((left, right) => new Date(right.checkedAt || 0) - new Date(left.checkedAt || 0))[0] || null;
}

function localRankingCheck(keywords = [], now = new Date()) {
  const active = (keywords || []).filter((keyword) => keyword?.active !== false);
  const items = active.map((keyword) => {
    const result = latestResult(keyword);
    const position = Number.isFinite(Number(result?.position)) ? Number(result.position) : null;
    const ageDays = daysSince(result?.checkedAt, now);
    const fresh = ageDays != null && ageDays <= RANKING_FRESHNESS_TARGET_DAYS;

    return {
      keywordId: keyword.id,
      keyword: keyword.keyword,
      city: keyword.city,
      lastCheckStatus: keyword.lastCheckStatus || null,
      found: Boolean(result?.found),
      position,
      checkedAt: result?.checkedAt || null,
      ageDays,
      fresh,
      top10: position != null && position <= 10,
      top20: position != null && position <= 20,
    };
  });

  const measured = items.filter((item) => item.checkedAt);
  const fresh = measured.filter((item) => item.fresh);
  const top10 = fresh.filter((item) => item.top10);
  const top20 = fresh.filter((item) => item.top20);
  const missingOrStale = items.filter((item) => !item.checkedAt || !item.fresh);
  const passed = active.length > 0 && missingOrStale.length === 0;

  return {
    code: "LOCAL_RANKINGS",
    label: "Suivi des positions locales",
    required: false,
    passed,
    freshnessTargetDays: RANKING_FRESHNESS_TARGET_DAYS,
    activeKeywords: active.length,
    measuredKeywords: measured.length,
    freshKeywords: fresh.length,
    top10Keywords: top10.length,
    top20Keywords: top20.length,
    top10Rate: fresh.length ? Math.round((top10.length / fresh.length) * 1000) / 1000 : 0,
    top20Rate: fresh.length ? Math.round((top20.length / fresh.length) * 1000) / 1000 : 0,
    missingOrStale: missingOrStale.slice(0, 20),
    items: items.slice(0, 50),
    recommendation: passed
      ? null
      : active.length === 0
        ? "Définir quelques requêtes locales réellement stratégiques pour suivre la visibilité de l'agence dans sa zone de chalandise."
        : "Relancer les mesures de position pour les mots-clés sans résultat récent avant d'évaluer l'impact SEO du mini-site.",
  };
}

async function localRankingsReadiness(database, tenantId, agencyId) {
  const keywords = await database.rankingKeyword.findMany({
    where: {
      agencyId: Number(agencyId),
      active: true,
      agency: { tenantId },
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      keyword: true,
      city: true,
      active: true,
      lastCheckStatus: true,
      results: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: {
          position: true,
          found: true,
          checkedAt: true,
        },
      },
    },
  });

  return localRankingCheck(keywords);
}

function applyLocalRankingsToReadiness(report, check) {
  const checks = Array.isArray(report?.checks) ? report.checks : [];
  return {
    ...report,
    version: "2.2",
    checks: [
      ...checks.filter((item) => item?.code !== "LOCAL_RANKINGS"),
      check,
    ],
  };
}

module.exports = {
  RANKING_FRESHNESS_TARGET_DAYS,
  daysSince,
  latestResult,
  localRankingCheck,
  localRankingsReadiness,
  applyLocalRankingsToReadiness,
};
