"use strict";

function finitePosition(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeRow(row) {
  if (!row) return null;

  return {
    id: row.id ?? null,
    agencyId: row.agencyId ?? null,
    keyword: row.keyword ?? null,
    city: row.city ?? null,
    found: Boolean(row.found),
    position: finitePosition(row.position),
    absolutePosition: finitePosition(row.absolutePosition),
    rating: Number.isFinite(Number(row.rating))
      ? Number(row.rating)
      : null,
    reviews: Number.isFinite(Number(row.reviews))
      ? Number(row.reviews)
      : null,
    checkedAt: row.checkedAt ?? null
  };
}

function compareRanking(latestInput, previousInput) {
  const latest = normalizeRow(latestInput);
  const previous = normalizeRow(previousInput);

  if (!latest) {
    return {
      trend: "UNKNOWN",
      positionDelta: null,
      absolutePositionDelta: null,
      foundTransition: null
    };
  }

  if (!previous) {
    return {
      trend: latest.found ? "NEW" : "UNKNOWN",
      positionDelta: null,
      absolutePositionDelta: null,
      foundTransition: latest.found ? "NEW" : null
    };
  }

  if (previous.found && !latest.found) {
    return {
      trend: "LOST",
      positionDelta: null,
      absolutePositionDelta: null,
      foundTransition: "LOST"
    };
  }

  if (!previous.found && latest.found) {
    return {
      trend: "NEW",
      positionDelta: null,
      absolutePositionDelta: null,
      foundTransition: "FOUND"
    };
  }

  if (!latest.found && !previous.found) {
    return {
      trend: "STABLE",
      positionDelta: null,
      absolutePositionDelta: null,
      foundTransition: null
    };
  }

  const positionDelta =
    latest.position != null && previous.position != null
      ? previous.position - latest.position
      : null;

  const absolutePositionDelta =
    latest.absolutePosition != null &&
    previous.absolutePosition != null
      ? previous.absolutePosition - latest.absolutePosition
      : null;

  let trend = "STABLE";

  if (positionDelta != null) {
    if (positionDelta > 0) trend = "IMPROVING";
    if (positionDelta < 0) trend = "DECLINING";
  }

  return {
    trend,
    positionDelta,
    absolutePositionDelta,
    foundTransition: null
  };
}

function rankingPriority(latestInput, comparison = {}) {
  const latest = normalizeRow(latestInput);

  if (!latest) return "CRITICAL";

  if (
    comparison.trend === "LOST" ||
    !latest.found ||
    latest.position == null
  ) {
    return "CRITICAL";
  }

  if (latest.position > 10) return "CRITICAL";
  if (latest.position >= 6) return "HIGH";
  if (latest.position >= 4) return "MEDIUM";
  if (latest.position >= 2) return "LOW";

  return "LEADER";
}

const PRIORITY_WEIGHT = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  LEADER: 1
};

function recommendationFor(item) {
  const priority = item.priority;
  const trend = item.trend;

  if (trend === "LOST") {
    return "Confirmer immédiatement la perte de visibilité puis contrôler la fiche, la page cible et la SERP.";
  }

  if (priority === "CRITICAL") {
    return "Prioriser cette requête : confirmer la mesure puis analyser la page cible, la concurrence locale et la couverture SEO.";
  }

  if (trend === "DECLINING") {
    return "Surveiller le recul et confirmer la tendance avant toute modification éditoriale.";
  }

  if (priority === "HIGH") {
    return "Travailler cette requête en priorité pour viser le top 5 puis le top 3.";
  }

  if (priority === "MEDIUM") {
    return "Renforcer les signaux locaux et le contenu de la page cible pour gagner les dernières positions.";
  }

  if (priority === "LOW") {
    return "Consolider la position et rechercher un passage dans le top 1.";
  }

  if (priority === "LEADER") {
    return "Maintenir la position et surveiller toute dégradation.";
  }

  return null;
}

function buildKeywordIntelligence({
  agency,
  keyword,
  rows = []
}) {
  const ordered = [...rows]
    .filter(Boolean)
    .sort(
      (a, b) =>
        new Date(b.checkedAt || 0).getTime() -
        new Date(a.checkedAt || 0).getTime()
    );

  const latest = normalizeRow(ordered[0]);
  const previous = normalizeRow(ordered[1]);

  const comparison = compareRanking(latest, previous);
  const priority = rankingPriority(latest, comparison);

  const result = {
    agencyId: agency?.id ?? latest?.agencyId ?? null,
    agencyName: agency?.name ?? null,
    city: agency?.city ?? latest?.city ?? null,
    keyword: keyword ?? latest?.keyword ?? null,
    latest,
    previous,
    ...comparison,
    priority
  };

  return {
    ...result,
    recommendation: recommendationFor(result)
  };
}

function buildAgencyIntelligence({
  agency,
  rows = []
}) {
  const groups = new Map();

  for (const row of rows) {
    const key = String(row?.keyword || "").trim();
    if (!key) continue;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const keywords = [...groups.entries()]
    .map(([keyword, keywordRows]) =>
      buildKeywordIntelligence({
        agency,
        keyword,
        rows: keywordRows
      })
    )
    .sort((a, b) => {
      const pd =
        PRIORITY_WEIGHT[b.priority] -
        PRIORITY_WEIGHT[a.priority];

      if (pd !== 0) return pd;

      const ap = a.latest?.position ?? 999;
      const bp = b.latest?.position ?? 999;

      if (ap !== bp) return bp - ap;

      return String(a.keyword).localeCompare(String(b.keyword));
    });

  const highest =
    keywords.reduce(
      (max, item) =>
        Math.max(max, PRIORITY_WEIGHT[item.priority] || 0),
      0
    );

  const agencyPriority =
    Object.entries(PRIORITY_WEIGHT)
      .find(([, weight]) => weight === highest)?.[0] ||
    "LEADER";

  return {
    agency: {
      id: agency?.id ?? null,
      name: agency?.name ?? null,
      city: agency?.city ?? null
    },
    priority: agencyPriority,
    keywords,
    summary: {
      keywords: keywords.length,
      leaders: keywords.filter(i => i.priority === "LEADER").length,
      critical: keywords.filter(i => i.priority === "CRITICAL").length,
      improving: keywords.filter(i => i.trend === "IMPROVING").length,
      declining: keywords.filter(i => i.trend === "DECLINING").length,
      lost: keywords.filter(i => i.trend === "LOST").length
    }
  };
}

function buildNetworkIntelligence(items = []) {
  const agencies = items
    .map(buildAgencyIntelligence)
    .sort((a, b) => {
      const pd =
        PRIORITY_WEIGHT[b.priority] -
        PRIORITY_WEIGHT[a.priority];

      if (pd !== 0) return pd;

      return String(a.agency.city || "")
        .localeCompare(String(b.agency.city || ""));
    });

  const opportunities = agencies
    .flatMap(agency =>
      agency.keywords.map(keyword => ({
        agencyId: agency.agency.id,
        agencyName: agency.agency.name,
        city: agency.agency.city,
        ...keyword
      }))
    )
    .sort((a, b) => {
      const pd =
        PRIORITY_WEIGHT[b.priority] -
        PRIORITY_WEIGHT[a.priority];

      if (pd !== 0) return pd;

      if (
        a.trend === "DECLINING" &&
        b.trend !== "DECLINING"
      ) return -1;

      if (
        b.trend === "DECLINING" &&
        a.trend !== "DECLINING"
      ) return 1;

      return (
        (b.latest?.position ?? 999) -
        (a.latest?.position ?? 999)
      );
    });

  return {
    version: "4.5",
    mode: "ranking_intelligence",
    summary: {
      agencies: agencies.length,
      keywords: opportunities.length,
      critical: opportunities.filter(i => i.priority === "CRITICAL").length,
      high: opportunities.filter(i => i.priority === "HIGH").length,
      medium: opportunities.filter(i => i.priority === "MEDIUM").length,
      low: opportunities.filter(i => i.priority === "LOW").length,
      leaders: opportunities.filter(i => i.priority === "LEADER").length,
      improving: opportunities.filter(i => i.trend === "IMPROVING").length,
      declining: opportunities.filter(i => i.trend === "DECLINING").length,
      lost: opportunities.filter(i => i.trend === "LOST").length
    },
    opportunities,
    agencies
  };
}

module.exports = {
  PRIORITY_WEIGHT,
  finitePosition,
  normalizeRow,
  compareRanking,
  rankingPriority,
  recommendationFor,
  buildKeywordIntelligence,
  buildAgencyIntelligence,
  buildNetworkIntelligence
};
