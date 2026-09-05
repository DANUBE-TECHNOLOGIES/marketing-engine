"use strict";

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function urgencyFor(bucket = {}) {
  if (Number(bucket.p1) > 0) return "critical";
  if (Number(bucket.p2) > 0) return "high";
  if (Number(bucket.p3) > 0) return "medium";
  return "monitor";
}

function weightedPriority(bucket = {}) {
  const p1 = Number(bucket.p1) || 0;
  const p2 = Number(bucket.p2) || 0;
  const p3 = Number(bucket.p3) || 0;
  const averageRank = Number(bucket.averageRank);
  const rankWeight = Number.isFinite(averageRank) ? Math.min(10, averageRank / 10) : 0;
  return round((p1 * 5) + (p2 * 3) + p3 + rankWeight, 2);
}

function objectivesFor(bucket = {}) {
  const urgency = urgencyFor(bucket);
  if (urgency === "critical") {
    return {
      primary: "move critical cells toward top20, then top10",
      targetRank: 10,
      reviewAfter: "next comparable calibrated grid",
    };
  }
  if (urgency === "high") {
    return {
      primary: "move priority cells into top10",
      targetRank: 10,
      reviewAfter: "next comparable calibrated grid",
    };
  }
  if (urgency === "medium") {
    return {
      primary: "consolidate broad local visibility",
      targetRank: 10,
      reviewAfter: "next comparable calibrated grid",
    };
  }
  return {
    primary: "maintain current local visibility",
    targetRank: 10,
    reviewAfter: "periodic calibrated grid",
  };
}

function actionsFor(city, bucket = {}) {
  const urgency = urgencyFor(bucket);
  const common = [
    {
      code: "service_area_relevance",
      type: "onsite",
      action: `Strengthen truthful service-area relevance for ${city} on the existing agency experience.`,
      guardrail: "Do not create a fake office/location or a thin doorway page.",
    },
    {
      code: "local_proof",
      type: "content",
      action: `Add substantive proof of service for clients from ${city} when genuine examples exist.`,
      guardrail: "Use only real customer/service evidence and avoid fabricated local claims.",
    },
    {
      code: "internal_linking",
      type: "onsite",
      action: `Improve internal links from relevant local/travel content toward the Bois-Colombes agency page using natural ${city} context.`,
      guardrail: "Keep anchors natural; avoid repetitive exact-match stuffing.",
    },
    {
      code: "local_mentions",
      type: "offsite",
      action: `Seek legitimate local mentions, partnerships or citations connected with ${city}.`,
      guardrail: "Prefer real local relationships and reputable directories; avoid paid link schemes.",
    },
    {
      code: "review_signal",
      type: "reputation",
      action: `When a genuine client from ${city} completes a trip, request a Google review without prescribing wording.`,
      guardrail: "Never incentivize reviews or ask clients to insert keywords artificially.",
    },
  ];

  if (urgency === "critical" || urgency === "high") {
    common.push({
      code: "editorial_activation",
      type: "publishing",
      action: `Plan useful local editorial content relevant to travellers in ${city}, linked back to the agency page.`,
      guardrail: "Content must add unique value; do not mass-produce near-duplicate city pages.",
    });
  }

  return common;
}

function buildTerritorialActionPlan({ campaignId, agencyId, city, byCity = {}, cells = [] } = {}) {
  const territories = Object.entries(byCity)
    .filter(([name]) => name && name !== "unresolved")
    .map(([name, bucket]) => {
      const matchingCells = cells.filter((cell) => cell.territory?.city === name);
      return {
        city: name,
        urgency: urgencyFor(bucket),
        score: weightedPriority(bucket),
        cells: Number(bucket.cells) || matchingCells.length,
        p1: Number(bucket.p1) || 0,
        p2: Number(bucket.p2) || 0,
        p3: Number(bucket.p3) || 0,
        averageRank: Number.isFinite(Number(bucket.averageRank)) ? Number(bucket.averageRank) : null,
        worstRank: matchingCells.length
          ? Math.max(...matchingCells.map((cell) => Number(cell.rank)).filter(Number.isFinite))
          : null,
        objectives: objectivesFor(bucket),
        actions: actionsFor(name, bucket),
      };
    })
    .sort((a, b) => b.score - a.score || (b.averageRank ?? 0) - (a.averageRank ?? 0) || a.city.localeCompare(b.city));

  return {
    mode: "read_only",
    databaseWrites: 0,
    providerCalls: 0,
    executionTriggered: false,
    campaignId: Number(campaignId),
    agencyId: Number(agencyId),
    agencyCity: city || null,
    doorwayGuard: "Territorial recommendations must strengthen a real agency/service area and must not create fake locations or thin near-duplicate doorway pages.",
    summary: {
      territories: territories.length,
      critical: territories.filter((row) => row.urgency === "critical").length,
      high: territories.filter((row) => row.urgency === "high").length,
      medium: territories.filter((row) => row.urgency === "medium").length,
      monitor: territories.filter((row) => row.urgency === "monitor").length,
      topPriorityCity: territories[0]?.city || null,
    },
    territories,
  };
}

module.exports = {
  urgencyFor,
  weightedPriority,
  objectivesFor,
  actionsFor,
  buildTerritorialActionPlan,
};
