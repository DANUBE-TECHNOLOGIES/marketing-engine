"use strict";

const {
  buildTerritorialExecutionPlan,
} = require("./territorial-execution-plan");

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
  const rankWeight = Number.isFinite(averageRank)
    ? Math.min(10, averageRank / 10)
    : 0;

  return round(
    (p1 * 10) +
    (p2 * 3) +
    p3 +
    rankWeight,
    2
  );
}

function urgencyWeight(urgency) {
  return ({
    critical: 4,
    high: 3,
    medium: 2,
    monitor: 1,
  })[urgency] || 0;
}

function objectivesFor(bucket = {}) {
  const urgency = urgencyFor(bucket);

  if (urgency === "critical") {
    return {
      primary:
        "Ramener d’abord les cellules critiques dans le Top 20, puis viser le Top 10",
      targetRank: 10,
      reviewAfter:
        "Prochain relevé calibré strictement comparable",
    };
  }

  if (urgency === "high") {
    return {
      primary:
        "Faire progresser les cellules prioritaires vers le Top 10",
      targetRank: 10,
      reviewAfter:
        "Prochain relevé calibré strictement comparable",
    };
  }

  if (urgency === "medium") {
    return {
      primary:
        "Consolider la visibilité locale sur l’ensemble de la zone",
      targetRank: 10,
      reviewAfter:
        "Prochain relevé calibré strictement comparable",
    };
  }

  return {
    primary:
      "Maintenir le niveau actuel de visibilité locale",
    targetRank: 10,
    reviewAfter:
      "Contrôle périodique sur une grille calibrée comparable",
  };
}

function actionsFor(city, bucket = {}) {
  const urgency = urgencyFor(bucket);

  const common = [
    {
      code: "service_area_relevance",
      type: "onsite",
      action:
        `Renforcer la pertinence réelle de la zone de chalandise pour ${city} ` +
        "dans les contenus existants de l’agence.",
      guardrail:
        "Ne créer ni fausse implantation, ni fausse adresse, ni page locale artificielle de type doorway page.",
    },
    {
      code: "local_proof",
      type: "content",
      action:
        `Ajouter des preuves concrètes de clients ou de services liés à ${city} ` +
        "uniquement lorsque des exemples réels existent.",
      guardrail:
        "Utiliser uniquement des preuves réelles et vérifiables ; ne jamais fabriquer de signal local.",
    },
    {
      code: "internal_linking",
      type: "onsite",
      action:
        `Renforcer le maillage interne depuis les contenus voyage ou locaux pertinents ` +
        `vers la page de l’agence, avec un contexte naturel lié à ${city}.`,
      guardrail:
        "Conserver des ancres naturelles et éviter toute répétition artificielle de mots-clés ou de communes.",
    },
    {
      code: "local_mentions",
      type: "offsite",
      action:
        `Développer des mentions, partenariats ou citations locales légitimes ` +
        `ayant un lien réel avec ${city}.`,
      guardrail:
        "Privilégier les relations locales réelles et les annuaires fiables ; exclure les schémas de liens artificiels.",
    },
    {
      code: "review_signal",
      type: "reputation",
      action:
        `Lorsqu’un véritable client de ${city} termine son voyage, solliciter naturellement ` +
        "son avis Google sans lui imposer de formulation.",
      guardrail:
        "Ne jamais rémunérer ou conditionner un avis, ni demander l’insertion artificielle de mots-clés.",
    },
  ];

  if (urgency === "critical" || urgency === "high") {
    common.push({
      code: "editorial_activation",
      type: "publishing",
      action:
        `Planifier un contenu éditorial réellement utile aux voyageurs de ${city}, ` +
        "avec un lien naturel vers l’agence lorsque le sujet le justifie.",
      guardrail:
        "Le contenu doit apporter une valeur propre ; ne pas produire en série des pages quasi identiques par commune.",
    });
  }

  return common;
}

function buildTerritorialActionPlan({
  campaignId,
  agencyId,
  city,
  byCity = {},
  cells = [],
} = {}) {
  const territories = Object.entries(byCity)
    .filter(([name]) => name && name !== "unresolved")
    .map(([name, bucket]) => {
      const matchingCells = cells.filter(
        (cell) => cell.territory?.city === name
      );

      return {
        city: name,
        urgency: urgencyFor(bucket),
        score: weightedPriority(bucket),
        cells: Number(bucket.cells) || matchingCells.length,
        p1: Number(bucket.p1) || 0,
        p2: Number(bucket.p2) || 0,
        p3: Number(bucket.p3) || 0,
        averageRank: Number.isFinite(Number(bucket.averageRank))
          ? Number(bucket.averageRank)
          : null,
        worstRank: matchingCells.length
          ? Math.max(
              ...matchingCells
                .map((cell) => Number(cell.rank))
                .filter(Number.isFinite)
            )
          : null,
        gridCells: matchingCells.map((cell) => ({
          row: Number(cell.row),
          col: Number(cell.col),
          rank: Number.isFinite(Number(cell.rank))
            ? Number(cell.rank)
            : null,
          priority: cell.priority || null,
          latitude: Number.isFinite(Number(cell.latitude))
            ? Number(cell.latitude)
            : null,
          longitude: Number.isFinite(Number(cell.longitude))
            ? Number(cell.longitude)
            : null,
        })),
        objectives: objectivesFor(bucket),
        actions: actionsFor(name, bucket),
      };
    })
    .sort(
      (a, b) =>
        urgencyWeight(b.urgency) -
          urgencyWeight(a.urgency) ||
        b.score - a.score ||
        (b.averageRank ?? 0) -
          (a.averageRank ?? 0) ||
        a.city.localeCompare(b.city)
    );

  const plan = {
    mode: "read_only",
    databaseWrites: 0,
    providerCalls: 0,
    executionTriggered: false,
    campaignId: Number(campaignId),
    agencyId: Number(agencyId),
    agencyCity: city || null,

    doorwayGuard:
      "Les recommandations territoriales doivent renforcer une agence réelle " +
      "et sa véritable zone de service. Elles ne doivent créer ni fausse implantation " +
      "(fake location), ni page locale pauvre ou quasi dupliquée.",

    summary: {
      territories: territories.length,
      critical: territories.filter(
        (row) => row.urgency === "critical"
      ).length,
      high: territories.filter(
        (row) => row.urgency === "high"
      ).length,
      medium: territories.filter(
        (row) => row.urgency === "medium"
      ).length,
      monitor: territories.filter(
        (row) => row.urgency === "monitor"
      ).length,
      topPriorityCity:
        territories[0]?.city || null,
    },

    territories,
  };

  return {
    ...plan,
    executionPlan:
      buildTerritorialExecutionPlan(plan),
  };
}

module.exports = {
  urgencyFor,
  weightedPriority,
  urgencyWeight,
  objectivesFor,
  actionsFor,
  buildTerritorialActionPlan,
};
