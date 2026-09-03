"use strict";

const IMPACT_WINDOWS_DAYS = [7, 14, 30];

function validPosition(value) {
  const position = Number(value);
  return Number.isFinite(position) && position > 0 ? position : null;
}

function closestResultAtOrBefore(results = [], date) {
  const target = new Date(date).getTime();
  return [...results]
    .filter((item) => new Date(item?.checkedAt || 0).getTime() <= target)
    .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt))[0] || null;
}

function closestResultAtOrAfter(results = [], date) {
  const target = new Date(date).getTime();
  return [...results]
    .filter((item) => new Date(item?.checkedAt || 0).getTime() >= target)
    .sort((a, b) => new Date(a.checkedAt) - new Date(b.checkedAt))[0] || null;
}

function positionDelta(before, after) {
  const beforePosition = validPosition(before?.position);
  const afterPosition = validPosition(after?.position);
  if (beforePosition == null || afterPosition == null) return null;
  return beforePosition - afterPosition;
}

function impactLabel(delta) {
  if (delta == null) return "insufficient_data";
  if (delta >= 3) return "improved";
  if (delta <= -3) return "declined";
  return "stable";
}

function actionRankingImpact(action, results = []) {
  const executedAt = action?.executedAt ? new Date(action.executedAt) : null;
  if (!executedAt || Number.isNaN(executedAt.getTime()) || !action?.keywordId) {
    return {
      actionId: action?.id || null,
      keywordId: action?.keywordId || null,
      status: "unmeasurable",
      reason: "Action sans mot-clé mesurable ou date d'exécution exploitable.",
      baseline: null,
      windows: [],
    };
  }

  const baseline = closestResultAtOrBefore(results, executedAt);
  const windows = IMPACT_WINDOWS_DAYS.map((days) => {
    const target = new Date(executedAt.getTime() + days * 86400000);
    const result = closestResultAtOrAfter(results, target);
    const delta = positionDelta(baseline, result);
    return {
      days,
      targetAt: target.toISOString(),
      result: result
        ? {
            position: validPosition(result.position),
            found: Boolean(result.found),
            checkedAt: result.checkedAt,
          }
        : null,
      delta,
      observation: impactLabel(delta),
    };
  });

  return {
    actionId: action.id || null,
    keywordId: action.keywordId,
    keyword: action.keyword || null,
    executedAt: executedAt.toISOString(),
    status: baseline ? "observing" : "insufficient_baseline",
    baseline: baseline
      ? {
          position: validPosition(baseline.position),
          found: Boolean(baseline.found),
          checkedAt: baseline.checkedAt,
        }
      : null,
    windows,
    disclaimer: "Évolution observée après l'action ; elle ne prouve pas à elle seule un lien causal avec l'optimisation.",
  };
}

async function seoActionImpact(database, tenantId, agencyId, actions = []) {
  const keywordIds = [...new Set(
    actions
      .map((action) => Number(action?.keywordId))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];

  if (!keywordIds.length) return [];

  const keywords = await database.rankingKeyword.findMany({
    where: {
      id: { in: keywordIds },
      agencyId: Number(agencyId),
      agency: { tenantId },
    },
    select: {
      id: true,
      results: {
        orderBy: { checkedAt: "asc" },
        select: {
          position: true,
          found: true,
          checkedAt: true,
        },
      },
    },
  });

  const byKeyword = new Map(keywords.map((keyword) => [keyword.id, keyword.results || []]));
  return actions.map((action) => actionRankingImpact(action, byKeyword.get(Number(action.keywordId)) || []));
}

module.exports = {
  IMPACT_WINDOWS_DAYS,
  validPosition,
  closestResultAtOrBefore,
  closestResultAtOrAfter,
  positionDelta,
  impactLabel,
  actionRankingImpact,
  seoActionImpact,
};
