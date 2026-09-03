"use strict";

const {
  buildDeterministicSuggestions,
} = require(
  "./deterministic-provider"
);

const {
  requestExternalProvider,
} = require(
  "./external-provider"
);

const {
  normalizeEditorialResponse,
} = require(
  "./response-validator"
);

const {
  validateGeneratePayload,
} = require(
  "./validation"
);

const {
  TravelCoreContextResolver,
} = require(
  "./context-resolver"
);

const {
  auditEditorialSuggestions,
} = require(
  "./factuality-auditor"
);

class EditorialAiService {
  constructor(options = {}) {
    this.externalProvider =
      options.externalProvider ||
      requestExternalProvider;

    this.deterministicProvider =
      options.deterministicProvider ||
      buildDeterministicSuggestions;

    this.contextResolver =
      options.contextResolver ||
      new TravelCoreContextResolver({
        travelCore:
          options.travelCore,
      });
  }

  health() {
    return {
      module:
        "editorial-ai",

      defaultMode:
        process.env
          .EDITORIAL_AI_MODE ||
        "auto",

      externalConfigured:
        Boolean(
          process.env
            .EDITORIAL_AI_ENDPOINT
        ),

      capabilities: [
        "deterministic-fallback",
        "external-provider",
        "human-review",
        "seo-suggestions",
        "hero-suggestions",
        "faq-suggestions",
        "cta-suggestions",
        "travel-core-grounding",
        "source-traceability",
        "factuality-audit",
        "unsupported-claim-detection",
      ],
    };
  }

  async generate(input) {
    const payload =
      validateGeneratePayload(
        input
      );

    const grounding =
      payload.context.travelCore &&
      typeof payload.context
        .travelCore === "object"
        ? payload.context.travelCore
        : await this.contextResolver
            .resolve(
              payload.context
                .destination
            );

    const groundedPayload = {
      ...payload,

      context: {
        ...payload.context,
        travelCore:
          grounding,
      },
    };

    const fallback =
      this.deterministicProvider(
        groundedPayload
      );

    const fallbackAudit =
      auditEditorialSuggestions(
        fallback,
        grounding
      );

    if (
      groundedPayload.mode ===
      "deterministic"
    ) {
      return {
        provider:
          "deterministic",

        fallbackUsed:
          false,

        grounding,

        factuality:
          fallbackAudit,

        suggestions:
          fallback,
      };
    }

    try {
      const externalResponse =
        await this.externalProvider(
          groundedPayload
        );

      const suggestions =
        normalizeEditorialResponse(
          externalResponse,
          fallback
        );

      const externalAudit =
        auditEditorialSuggestions(
          suggestions,
          grounding
        );

      return {
        provider:
          "external",

        fallbackUsed:
          false,

        grounding,

        factuality:
          externalAudit,

        suggestions,
      };
    } catch (error) {
      if (
        groundedPayload.mode ===
        "external"
      ) {
        throw error;
      }

      return {
        provider:
          "deterministic",

        fallbackUsed:
          true,

        fallbackReason:
          error?.code ||
          "EDITORIAL_AI_EXTERNAL_FAILURE",

        grounding,

        factuality:
          fallbackAudit,

        suggestions:
          fallback,
      };
    }
  }
}

module.exports = {
  EditorialAiService,
};
