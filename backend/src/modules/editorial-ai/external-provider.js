"use strict";

const {
  createError,
} = require("./validation");

function buildPrompt(payload) {
  return {
    task:
      "Generate French travel-agency editorial suggestions.",

    constraints: {
      locale:
        payload.context.locale,

      tone:
        payload.context.tone,

      humanReviewRequired:
        true,

      prohibitedClaims: [
        "guaranteed lowest price",
        "invented availability",
        "invented hotel facts",
        "invented legal formalities",
        "invented climate facts",
        "invented prices or budget ranges",
        "invented flight duration",
        "invented health requirements",
      ],

      groundingRules: [
        "Use factual claims only when present in travelCoreContext.",
        "Use cautious generic wording when a fact is absent.",
        "Never infer live availability, schedules or promotional prices.",
        "Never present uncertain entry formalities as definitive.",
        "Never invent hotels, attractions or transport details.",
      ],

      outputFormat: {
        destination:
          "string",

        agency:
          "string",

        page: {
          title:
            "string",

          slug:
            "string",

          seoTitle:
            "30 to 60 characters",

          seoDescription:
            "120 to 160 characters",
        },

        hero: {
          titles:
            "array of 3 strings",

          subtitles:
            "array of 3 strings",

          ctas:
            "array of objects with label and href",
        },

        faq: {
          title:
            "string",

          items:
            "array of 4 objects with question and answer",
        },

        cta: {
          title:
            "string",

          text:
            "string",

          actions:
            "array of objects with label and href",
        },
      },
    },

    context: {
      destination:
        payload.context.destination,

      agency:
        payload.context.agency,

      intent:
        payload.context.intent,

      tone:
        payload.context.tone,

      locale:
        payload.context.locale,
    },

    travelCoreContext:
      payload.context.travelCore || {
        available: false,
        source: "travel-core",
        facts: {},
        sourceFields: [],
      },

    currentPage:
      payload.page,
  };
}

async function requestExternalProvider(
  payload,
  options = {}
) {
  const endpoint =
    options.endpoint ||
    process.env
      .EDITORIAL_AI_ENDPOINT;

  if (!endpoint) {
    throw createError(
      "Aucun endpoint IA éditorial n’est configuré.",
      "EDITORIAL_AI_ENDPOINT_MISSING",
      503
    );
  }

  const apiKey =
    options.apiKey ||
    process.env
      .EDITORIAL_AI_API_KEY ||
    "";

  const timeoutMs =
    Number(
      options.timeoutMs ||
      process.env
        .EDITORIAL_AI_TIMEOUT_MS ||
      20000
    );

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(endpoint, {
        method: "POST",

        headers: {
          accept:
            "application/json",

          "content-type":
            "application/json",

          ...(apiKey
            ? {
                authorization:
                  `Bearer ${apiKey}`,
              }
            : {}),
        },

        body:
          JSON.stringify(
            buildPrompt(payload)
          ),

        signal:
          controller.signal,
      });

    const raw =
      await response.text();

    let body;

    try {
      body = raw
        ? JSON.parse(raw)
        : {};
    } catch {
      throw createError(
        "Le fournisseur IA a retourné une réponse non JSON.",
        "EDITORIAL_AI_NON_JSON_RESPONSE",
        502
      );
    }

    if (!response.ok) {
      throw createError(
        body?.message ||
        body?.error ||
        `Erreur fournisseur IA (${response.status}).`,
        "EDITORIAL_AI_PROVIDER_ERROR",
        502,
        {
          providerStatus:
            response.status,
        }
      );
    }

    return (
      body?.suggestions ||
      body?.data ||
      body
    );
  } catch (error) {
    if (
      error?.name ===
      "AbortError"
    ) {
      throw createError(
        "Le fournisseur IA n’a pas répondu dans le délai imparti.",
        "EDITORIAL_AI_TIMEOUT",
        504,
        {
          timeoutMs,
        }
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  buildPrompt,
  requestExternalProvider,
};
