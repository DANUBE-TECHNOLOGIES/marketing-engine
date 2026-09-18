"use strict";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function rankFor(point) {
  if (!point || point.found !== true) return null;
  const rank = finite(point.position);
  return rank != null && rank > 0 ? rank : null;
}

function average(values) {
  const valid = values.filter(Number.isFinite);
  if (!valid.length) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function direction8(point) {
  const north = finite(point?.northKm);
  const east = finite(point?.eastKm);

  if (north == null || east == null) return "unknown";

  if (Math.abs(north) < 0.001 && Math.abs(east) < 0.001) {
    return "center";
  }

  const angle = Math.atan2(north, east) * 180 / Math.PI;

  if (angle >= -22.5 && angle < 22.5) return "east";
  if (angle >= 22.5 && angle < 67.5) return "north_east";
  if (angle >= 67.5 && angle < 112.5) return "north";
  if (angle >= 112.5 && angle < 157.5) return "north_west";
  if (angle >= 157.5 || angle < -157.5) return "west";
  if (angle >= -157.5 && angle < -112.5) return "south_west";
  if (angle >= -112.5 && angle < -67.5) return "south";
  return "south_east";
}

function quadrant(point) {
  const north = finite(point?.northKm);
  const east = finite(point?.eastKm);

  if (north == null || east == null) return "unknown";

  if (Math.abs(north) < 0.001 && Math.abs(east) < 0.001) {
    return "center";
  }

  if (north >= 0 && east >= 0) return "north_east";
  if (north >= 0 && east < 0) return "north_west";
  if (north < 0 && east >= 0) return "south_east";
  return "south_west";
}

function distanceKm(point) {
  const north = finite(point?.northKm);
  const east = finite(point?.eastKm);

  if (north == null || east == null) return null;

  return Math.sqrt((north ** 2) + (east ** 2));
}

function summarize(points) {
  const rows = points
    .map((point) => ({
      point,
      rank: rankFor(point),
    }))
    .filter((row) => row.rank != null);

  const ranks = rows.map((row) => row.rank);

  return {
    points: points.length,
    found: rows.length,
    presenceRate: points.length
      ? round(rows.length / points.length, 3)
      : 0,
    averagePosition: round(average(ranks)),
    bestPosition: ranks.length ? Math.min(...ranks) : null,
    worstPosition: ranks.length ? Math.max(...ranks) : null,
    top3Rate: rows.length
      ? round(rows.filter((row) => row.rank <= 3).length / rows.length, 3)
      : 0,
    top10Rate: rows.length
      ? round(rows.filter((row) => row.rank <= 10).length / rows.length, 3)
      : 0,
    top20Rate: rows.length
      ? round(rows.filter((row) => row.rank <= 20).length / rows.length, 3)
      : 0,
  };
}

function summarizeBy(points, classifier, labels) {
  return Object.fromEntries(
    labels.map((label) => [
      label,
      summarize(points.filter((point) => classifier(point) === label)),
    ])
  );
}

function diagnosticProfile({
  centerRank,
  outerAverage,
  worstQuadrant,
  worstQuadrantAverage,
  asymmetryDelta,
}) {
  if (centerRank == null) {
    return {
      code: "insufficient_center_data",
      severity: "unknown",
      label: "Données centrales insuffisantes",
    };
  }

  const outerDelta =
    outerAverage != null ? round(outerAverage - centerRank) : null;

  if (
    centerRank <= 3 &&
    (
      (outerDelta != null && outerDelta >= 15) ||
      (worstQuadrantAverage != null && worstQuadrantAverage >= 20)
    )
  ) {
    return {
      code: "strong_center_directional_collapse",
      severity: "critical",
      label: "Centre fort, effondrement territorial directionnel",
    };
  }

  if (
    centerRank <= 3 &&
    outerDelta != null &&
    outerDelta >= 8
  ) {
    return {
      code: "strong_center_limited_radius",
      severity: "watch",
      label: "Centre fort, rayon d’autorité limité",
    };
  }

  if (centerRank > 10) {
    return {
      code: "weak_core_visibility",
      severity: "critical",
      label: "Visibilité centrale insuffisante",
    };
  }

  if (asymmetryDelta != null && asymmetryDelta >= 10) {
    return {
      code: "directional_asymmetry",
      severity: "watch",
      label: "Forte asymétrie territoriale",
    };
  }

  return {
    code: "balanced_local_authority",
    severity: "strong",
    label: "Autorité locale relativement homogène",
  };
}

function recommendationsFor(profile, context) {
  const recommendations = [];

  if (profile.code === "strong_center_directional_collapse") {
    recommendations.push(
      {
        code: "local_authority_expansion",
        priority: "p1",
        title: "Étendre l’autorité locale",
        rationale:
          `La fiche performe au centre mais décroche fortement vers ${context.worstQuadrantLabel}.`,
      },
      {
        code: "reviews_velocity",
        priority: "p1",
        title: "Accélérer les avis Google",
        rationale:
          "Renforcer la preuve locale et la fraîcheur de la réputation plutôt que sur-optimiser le contenu du mini-site.",
      },
      {
        code: "territorial_citations",
        priority: "p1",
        title: "Renforcer les citations territoriales",
        rationale:
          `Développer des signaux externes cohérents dans la zone ${context.worstQuadrantLabel}.`,
      },
      {
        code: "local_content_support",
        priority: "p2",
        title: "Soutenir les zones faibles par du contenu utile",
        rationale:
          "Créer uniquement des signaux éditoriaux justifiés par l’activité réelle, sans répétition artificielle de communes.",
      }
    );
  } else if (profile.code === "strong_center_limited_radius") {
    recommendations.push(
      {
        code: "radius_expansion",
        priority: "p1",
        title: "Étendre le rayon de pertinence",
        rationale:
          "La visibilité est forte autour de l’agence mais décroît rapidement avec la distance.",
      },
      {
        code: "reviews_velocity",
        priority: "p2",
        title: "Maintenir un flux régulier d’avis",
        rationale:
          "Consolider progressivement l’autorité locale autour du point de vente.",
      }
    );
  } else if (profile.code === "weak_core_visibility") {
    recommendations.push(
      {
        code: "gbp_core_relevance",
        priority: "p1",
        title: "Revoir la pertinence GBP centrale",
        rationale:
          "Le classement est déjà insuffisant au point central ; l’expansion géographique n’est pas la première priorité.",
      }
    );
  } else if (profile.code === "directional_asymmetry") {
    recommendations.push(
      {
        code: "directional_authority",
        priority: "p1",
        title: "Corriger l’asymétrie territoriale",
        rationale:
          `La visibilité varie fortement selon les directions, avec une faiblesse principale vers ${context.worstQuadrantLabel}.`,
      }
    );
  }

  return recommendations;
}

const DIRECTION_LABELS = {
  north: "nord",
  north_east: "nord-est",
  east: "est",
  south_east: "sud-est",
  south: "sud",
  south_west: "sud-ouest",
  west: "ouest",
  north_west: "nord-ouest",
  center: "centre",
};

function analyzeDirectionalIntelligence(campaign) {
  if (!campaign || !Array.isArray(campaign.points)) {
    throw new TypeError("campaign with points is required");
  }

  const points = campaign.points;

  const directions = summarizeBy(
    points,
    direction8,
    [
      "north",
      "north_east",
      "east",
      "south_east",
      "south",
      "south_west",
      "west",
      "north_west",
    ]
  );

  const quadrants = summarizeBy(
    points,
    quadrant,
    [
      "north_east",
      "south_east",
      "south_west",
      "north_west",
    ]
  );

  const centerPoint = points.find(
    (point) =>
      Math.abs(Number(point.northKm)) < 0.001 &&
      Math.abs(Number(point.eastKm)) < 0.001
  );

  const centerRank = rankFor(centerPoint);

  const peripheralPoints = points.filter((point) => {
    const distance = distanceKm(point);
    return distance != null && distance >= 1.5;
  });

  const peripheral = summarize(peripheralPoints);

  const quadrantRows = Object.entries(quadrants)
    .filter(([, summary]) => summary.averagePosition != null)
    .map(([name, summary]) => ({
      name,
      label: DIRECTION_LABELS[name] || name,
      ...summary,
    }));

  const bestQuadrant = [...quadrantRows]
    .sort((a, b) => a.averagePosition - b.averagePosition)[0] || null;

  const worstQuadrant = [...quadrantRows]
    .sort((a, b) => b.averagePosition - a.averagePosition)[0] || null;

  const asymmetryDelta =
    bestQuadrant && worstQuadrant
      ? round(
          worstQuadrant.averagePosition -
          bestQuadrant.averagePosition
        )
      : null;

  const outerDelta =
    centerRank != null && peripheral.averagePosition != null
      ? round(peripheral.averagePosition - centerRank)
      : null;

  const profile = diagnosticProfile({
    centerRank,
    outerAverage: peripheral.averagePosition,
    worstQuadrant,
    worstQuadrantAverage: worstQuadrant?.averagePosition ?? null,
    asymmetryDelta,
  });

  const context = {
    worstQuadrant: worstQuadrant?.name || null,
    worstQuadrantLabel: worstQuadrant?.label || "la périphérie",
  };

  const recommendations = recommendationsFor(profile, context);

  const weakestCells = points
    .map((point) => ({
      row: Number(point.row),
      col: Number(point.col),
      northKm: finite(point.northKm),
      eastKm: finite(point.eastKm),
      distanceKm: round(distanceKm(point)),
      direction: direction8(point),
      quadrant: quadrant(point),
      rank: rankFor(point),
    }))
    .filter((cell) => cell.rank != null)
    .sort(
      (a, b) =>
        b.rank - a.rank ||
        (b.distanceKm ?? 0) - (a.distanceKm ?? 0)
    )
    .slice(0, 8);

  return {
    version: "mse-25.245-v1",
    campaignId: Number(campaign.id),
    agencyId: Number(campaign.agencyId),
    agencyName: campaign.agencyName || null,
    city: campaign.city || null,
    keyword: campaign.keyword || null,

    center: {
      rank: centerRank,
    },

    peripheral,

    decay: {
      centerRank,
      peripheralAveragePosition: peripheral.averagePosition,
      peripheralMinusCenter: outerDelta,
    },

    directions,
    quadrants,

    asymmetry: {
      bestQuadrant,
      worstQuadrant,
      delta: asymmetryDelta,
    },

    profile,
    recommendations,
    weakestCells,
  };
}

module.exports = {
  direction8,
  quadrant,
  summarize,
  analyzeDirectionalIntelligence,
};
