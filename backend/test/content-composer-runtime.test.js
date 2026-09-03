"use strict";

const test =
  require(
    "node:test"
  );

const assert =
  require(
    "node:assert/strict"
  );

const {
  createAiRuntimeConfig,
  ContentComposerMetrics,
  extractUsage,
  ResilientContentProvider,
  DeterministicContentProvider,
} =
  require(
    "../src/modules/content-composer"
  );

test(
  "runtime désactivé par défaut",
  () => {
    const config =
      createAiRuntimeConfig(
        {}
      );

    assert.equal(
      config.enabled,
      false
    );

    assert.equal(
      config.timeoutMs,
      30000
    );
  }
);

test(
  "runtime borne timeout et retries",
  () => {
    const config =
      createAiRuntimeConfig({
        CONTENT_AI_ENABLED:
          "true",

        CONTENT_AI_TIMEOUT_MS:
          "999999",

        CONTENT_AI_RETRIES:
          "99",
      });

    assert.equal(
      config.enabled,
      true
    );

    assert.equal(
      config.timeoutMs,
      120000
    );

    assert.equal(
      config.retries,
      3
    );
  }
);

test(
  "usage provider est normalisé",
  () => {
    const usage =
      extractUsage({
        usage: {
          input_tokens:
            100,

          output_tokens:
            50,

          total_tokens:
            150,
        },
      });

    assert.deepEqual(
      usage,
      {
        inputTokens:
          100,

        outputTokens:
          50,

        totalTokens:
          150,
      }
    );
  }
);

test(
  "metrics comptent les requêtes",
  () => {
    const metrics =
      new ContentComposerMetrics();

    const timer =
      metrics.start({
        provider:
          "test",

        model:
          "model",
      });

    metrics.success(
      timer,
      {
        usage: {
          inputTokens:
            10,

          outputTokens:
            5,

          totalTokens:
            15,
        },
      }
    );

    const snapshot =
      metrics.snapshot();

    assert.equal(
      snapshot.requests,
      1
    );

    assert.equal(
      snapshot.success,
      1
    );

    assert.equal(
      snapshot.totalTokens,
      15
    );
  }
);

test(
  "fallback reste fonctionnel sans primary",
  async () => {
    const provider =
      new ResilientContentProvider({
        fallback:
          new DeterministicContentProvider(),
      });

    const result =
      await provider.generate({
        template: {
          sections:
            [],

          seo:
            {},
        },

        context: {
          agency:
            {},

          seo:
            {},
        },

        instructions:
          "",
      });

    assert.equal(
      result.fallbackUsed,
      true
    );

    assert.equal(
      result.fallbackReason,
      "AI_PROVIDER_NOT_CONFIGURED"
    );
  }
);
