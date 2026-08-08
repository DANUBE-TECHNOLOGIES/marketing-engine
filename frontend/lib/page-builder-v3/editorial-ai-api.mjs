"use strict";

function normalizeString(
  value,
  fallback = ""
) {
  return String(
    value ?? fallback
  ).trim();
}

function normalizeGrounding(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      available: false,
      source: "travel-core",
      destination: "",
      destinationId: null,
      slug: null,
      facts: {},
      sourceFields: [],
    };
  }

  return {
    available:
      value.available === true,

    source:
      normalizeString(
        value.source,
        "travel-core"
      ),

    destination:
      normalizeString(
        value.destination
      ),

    destinationId:
      value.destinationId
        ? normalizeString(
            value.destinationId
          )
        : null,

    slug:
      value.slug
        ? normalizeString(
            value.slug
          )
        : null,

    facts:
      value.facts &&
      typeof value.facts === "object" &&
      !Array.isArray(value.facts)
        ? value.facts
        : {},

    sourceFields:
      Array.isArray(
        value.sourceFields
      )
        ? value.sourceFields
            .map(String)
            .filter(Boolean)
        : [],
  };
}

function normalizeFactualityResponse(
  value
) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {
      status: "safe",
      allowed: true,
      issueCount: 0,
      blockerCount: 0,
      warningCount: 0,
      auditedTextCount: 0,
      groundingAvailable: false,
      issues: [],
    };
  }

  const issues =
    Array.isArray(value.issues)
      ? value.issues
          .filter(
            (issue) =>
              issue &&
              typeof issue ===
                "object"
          )
          .map(
            (issue, index) => ({
              id:
                normalizeString(
                  issue.id,
                  `issue-${index}`
                ),

              rule:
                normalizeString(
                  issue.rule,
                  "unknown"
                ),

              path:
                normalizeString(
                  issue.path
                ),

              severity:
                issue.severity ===
                "blocked"
                  ? "blocked"
                  : "warning",

              message:
                normalizeString(
                  issue.message,
                  "Affirmation à vérifier."
                ),

              excerpt:
                normalizeString(
                  issue.excerpt
                ),

              requiredFields:
                Array.isArray(
                  issue.requiredFields
                )
                  ? issue.requiredFields
                      .map(String)
                      .filter(Boolean)
                  : [],
            })
          )
      : [];

  const blockerCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "blocked"
    ).length;

  const warningCount =
    issues.filter(
      (issue) =>
        issue.severity ===
        "warning"
    ).length;

  const status =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0
        ? "warning"
        : "safe";

  return {
    status,

    allowed:
      blockerCount === 0,

    issueCount:
      issues.length,

    blockerCount,

    warningCount,

    auditedTextCount:
      Number.isFinite(
        Number(
          value.auditedTextCount
        )
      )
        ? Number(
            value.auditedTextCount
          )
        : 0,

    groundingAvailable:
      value.groundingAvailable ===
      true,

    issues,
  };
}

export function buildEditorialAiPayload({
  page,
  destination,
  agency,
  intent,
  tone,
  mode = "auto",
  travelCore = null,
}) {
  return {
    mode:
      normalizeString(
        mode,
        "auto"
      ),

    page: {
      id:
        normalizeString(
          page?.id
        ),

      title:
        normalizeString(
          page?.title
        ),

      slug:
        normalizeString(
          page?.slug
        ),

      seoTitle:
        normalizeString(
          page?.seoTitle
        ),

      seoDescription:
        normalizeString(
          page?.seoDescription
        ),

      blocks:
        Array.isArray(
          page?.blocks
        )
          ? page.blocks
          : [],
    },

    context: {
      destination:
        normalizeString(
          destination
        ),

      agency:
        normalizeString(
          agency
        ),

      intent:
        normalizeString(
          intent,
          "voyage sur mesure"
        ),

      tone:
        normalizeString(
          tone,
          "professionnel, humain et inspirant"
        ),

      locale:
        "fr-FR",

      travelCore:
        travelCore &&
        typeof travelCore ===
          "object" &&
        !Array.isArray(travelCore)
          ? travelCore
          : null,
    },
  };
}

export async function generateEditorialAiSuggestions(
  input
) {
  const payload =
    buildEditorialAiPayload(
      input
    );

  if (
    !payload.context.destination
  ) {
    throw new Error(
      "La destination est obligatoire."
    );
  }

  const response =
    await fetch(
      "/api/website-builder/editorial-ai/generate",
      {
        method:
          "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",
        },

        body:
          JSON.stringify(
            payload
          ),
      }
    );

  let body = {};

  try {
    body =
      await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
      body?.error ||
      `Erreur de génération éditoriale (${response.status}).`
    );
  }

  if (
    !body?.suggestions ||
    typeof body.suggestions !==
      "object"
  ) {
    throw new Error(
      "Le fournisseur n’a retourné aucune suggestion."
    );
  }

  return {
    provider:
      normalizeString(
        body.provider,
        "unknown"
      ),

    fallbackUsed:
      body.fallbackUsed ===
      true,

    fallbackReason:
      body.fallbackReason
        ? normalizeString(
            body.fallbackReason
          )
        : null,

    grounding:
      normalizeGrounding(
        body.grounding
      ),

    factuality:
      normalizeFactualityResponse(
        body.factuality
      ),

    suggestions:
      body.suggestions,
  };
}

export {
  normalizeFactualityResponse,
  normalizeGrounding,
};
