"use strict";

const SENSITIVE_RULES = [
  {
    id: "price",
    severity: "blocked",
    requiredFields: [
      "budget",
    ],
    patterns: [
      /\b\d[\d\s.,]*\s*€\b/iu,
      /\b\d[\d\s.,]*\s*euros?\b/iu,
      /\bà partir de\b/iu,
      /\bprix\b/iu,
      /\btarif\b/iu,
      /\bpromotion\b/iu,
      /\bremise\b/iu,
    ],
    message:
      "Une affirmation tarifaire nécessite une donnée budget ou prix vérifiée.",
  },

  {
    id: "availability",
    severity: "blocked",
    requiredFields: [],
    alwaysUnsupported: true,
    patterns: [
      /\bdisponible\b/iu,
      /\bdisponibilité\b/iu,
      /\bdernières places\b/iu,
      /\bdernières chambres\b/iu,
      /\breste seulement\b/iu,
      /\bencore \d+\b/iu,
      /\bréservez vite\b/iu,
      /\boffre limitée\b/iu,
    ],
    message:
      "Les disponibilités et urgences commerciales ne peuvent pas être déduites de Travel Core.",
  },

  {
    id: "flight-duration",
    severity: "warning",
    requiredFields: [
      "flightDuration",
    ],
    patterns: [
      /\b\d+\s*h(?:eures?)?\b/iu,
      /\bdurée de vol\b/iu,
      /\bvol direct\b/iu,
      /\bsans escale\b/iu,
    ],
    message:
      "Une durée ou caractéristique de vol doit être présente dans Travel Core.",
  },

  {
    id: "formalities",
    severity: "blocked",
    requiredFields: [
      "formalities",
    ],
    patterns: [
      /\bpasseport\b/iu,
      /\bvisa\b/iu,
      /\bcarte d'identité\b/iu,
      /\bcarte nationale d'identité\b/iu,
      /\bformalités\b/iu,
      /\bautorisation électronique\b/iu,
      /\besta\b/iu,
      /\beta\b/iu,
    ],
    message:
      "Les formalités d’entrée doivent être explicitement sourcées.",
  },

  {
    id: "health",
    severity: "blocked",
    requiredFields: [
      "health",
    ],
    patterns: [
      /\bvaccin\b/iu,
      /\bvaccination\b/iu,
      /\btraitement antipaludique\b/iu,
      /\bpaludisme\b/iu,
      /\bfièvre jaune\b/iu,
      /\bsanté\b/iu,
    ],
    message:
      "Les informations sanitaires doivent être présentes dans Travel Core.",
  },

  {
    id: "climate",
    severity: "warning",
    requiredFields: [
      "bestMonths",
      "avoidMonths",
    ],
    patterns: [
      /\bmeilleure période\b/iu,
      /\bpériode idéale\b/iu,
      /\bsaison idéale\b/iu,
      /\bsaison sèche\b/iu,
      /\bsaison des pluies\b/iu,
      /\bmousson\b/iu,
      /\btempérature\b/iu,
      /\bclimat\b/iu,
    ],
    message:
      "Une recommandation climatique doit s’appuyer sur les données saisonnières.",
  },

  {
    id: "currency",
    severity: "warning",
    requiredFields: [
      "currency",
    ],
    patterns: [
      /\bdevise\b/iu,
      /\bmonnaie\b/iu,
      /\beuro\b/iu,
      /\bdollar\b/iu,
      /\bforint\b/iu,
      /\broupie\b/iu,
    ],
    message:
      "La monnaie locale doit être renseignée dans Travel Core.",
  },

  {
    id: "time-difference",
    severity: "warning",
    requiredFields: [
      "timeDifference",
    ],
    patterns: [
      /\bdécalage horaire\b/iu,
      /\bheure[s]? de décalage\b/iu,
      /\bfuseau horaire\b/iu,
    ],
    message:
      "Le décalage horaire doit être sourcé.",
  },
];

function flattenSuggestionText(value, path = "suggestions") {
  const entries = [];

  if (typeof value === "string") {
    const text = value
      .replace(/\s+/g, " ")
      .trim();

    if (text) {
      entries.push({
        path,
        text,
      });
    }

    return entries;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      entries.push(
        ...flattenSuggestionText(
          item,
          `${path}[${index}]`
        )
      );
    });

    return entries;
  }

  if (
    value &&
    typeof value === "object"
  ) {
    Object.entries(value).forEach(
      ([key, item]) => {
        entries.push(
          ...flattenSuggestionText(
            item,
            `${path}.${key}`
          )
        );
      }
    );
  }

  return entries;
}

function hasGroundingField(
  grounding,
  fields
) {
  if (!fields.length) {
    return false;
  }

  const availableFields =
    new Set(
      Array.isArray(
        grounding?.sourceFields
      )
        ? grounding.sourceFields
        : []
    );

  const facts =
    grounding?.facts &&
    typeof grounding.facts === "object"
      ? grounding.facts
      : {};

  return fields.some((field) => {
    if (availableFields.has(field)) {
      return true;
    }

    const value = facts[field];

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return (
      value !== null &&
      value !== undefined &&
      value !== ""
    );
  });
}

function auditEditorialSuggestions(
  suggestions,
  grounding = {}
) {
  const entries =
    flattenSuggestionText(
      suggestions
    );

  const issues = [];

  for (const entry of entries) {
    for (const rule of SENSITIVE_RULES) {
      const matched =
        rule.patterns.some(
          (pattern) =>
            pattern.test(entry.text)
        );

      if (!matched) {
        continue;
      }

      const supported =
        rule.alwaysUnsupported
          ? false
          : hasGroundingField(
              grounding,
              rule.requiredFields
            );

      if (supported) {
        continue;
      }

      issues.push({
        id:
          `${rule.id}:${entry.path}`,

        rule:
          rule.id,

        path:
          entry.path,

        severity:
          rule.severity,

        message:
          rule.message,

        excerpt:
          entry.text.slice(
            0,
            240
          ),

        requiredFields:
          rule.requiredFields,
      });
    }
  }

  const deduplicated = [];

  const seen = new Set();

  for (const issue of issues) {
    const key =
      `${issue.rule}:${issue.path}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduplicated.push(issue);
  }

  const blockers =
    deduplicated.filter(
      (issue) =>
        issue.severity ===
        "blocked"
    );

  const warnings =
    deduplicated.filter(
      (issue) =>
        issue.severity ===
        "warning"
    );

  return {
    status:
      blockers.length > 0
        ? "blocked"
        : warnings.length > 0
          ? "warning"
          : "safe",

    allowed:
      blockers.length === 0,

    issueCount:
      deduplicated.length,

    blockerCount:
      blockers.length,

    warningCount:
      warnings.length,

    issues:
      deduplicated,

    auditedTextCount:
      entries.length,

    groundingAvailable:
      grounding?.available ===
      true,
  };
}

function removeUnsupportedClaims(
  suggestions,
  audit
) {
  const unsafePaths =
    new Set(
      (audit?.issues || [])
        .filter(
          (issue) =>
            issue.severity ===
            "blocked"
        )
        .map(
          (issue) =>
            issue.path
        )
    );

  if (!unsafePaths.size) {
    return suggestions;
  }

  function cloneAndFilter(
    value,
    path = "suggestions"
  ) {
    if (
      unsafePaths.has(path)
    ) {
      return null;
    }

    if (Array.isArray(value)) {
      return value
        .map(
          (item, index) =>
            cloneAndFilter(
              item,
              `${path}[${index}]`
            )
        )
        .filter(
          (item) =>
            item !== null
        );
    }

    if (
      value &&
      typeof value === "object"
    ) {
      return Object.fromEntries(
        Object.entries(value)
          .map(([key, item]) => [
            key,
            cloneAndFilter(
              item,
              `${path}.${key}`
            ),
          ])
          .filter(
            ([, item]) =>
              item !== null
          )
      );
    }

    return value;
  }

  return cloneAndFilter(
    suggestions
  );
}

module.exports = {
  SENSITIVE_RULES,
  auditEditorialSuggestions,
  flattenSuggestionText,
  hasGroundingField,
  removeUnsupportedClaims,
};
