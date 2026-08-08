"use strict";

const {
  DeterministicContentProvider,
} =
  require(
    "./deterministic-provider"
  );

const {
  AiContentProvider,
} =
  require(
    "./ai-provider"
  );

const {
  ResilientContentProvider,
} =
  require(
    "./resilient-provider"
  );

const {
  HttpAiClient,
} =
  require(
    "./http-ai-client"
  );

const {
  createAiRuntimeConfig,
} =
  require(
    "./runtime-config"
  );

const {
  ContentComposerLogger,
} =
  require(
    "./observability"
  );

const {
  contentComposerMetrics,
} =
  require(
    "./metrics"
  );

function createContentProvider({
  aiClient =
    null,
  model =
    null,
  name =
    null,
  config =
    null,
  metrics =
    contentComposerMetrics,
  logger =
    null,
} = {}) {
  const runtimeConfig =
    config ||
    createAiRuntimeConfig();

  const runtimeLogger =
    logger ||
    new ContentComposerLogger({
      logPrompts:
        runtimeConfig.logPrompts,

      logResponses:
        runtimeConfig.logResponses,
    });

  const fallback =
    new DeterministicContentProvider();

  let client =
    aiClient;

  if (
    !client &&
    runtimeConfig.enabled &&
    runtimeConfig.baseUrl
  ) {
    client =
      new HttpAiClient({
        baseUrl:
          runtimeConfig.baseUrl,

        apiKey:
          runtimeConfig.apiKey,

        timeoutMs:
          runtimeConfig.timeoutMs,

        retries:
          runtimeConfig.retries,

        retryDelayMs:
          runtimeConfig.retryDelayMs,

        maxOutputTokens:
          runtimeConfig.maxOutputTokens,

        metrics,

        logger:
          runtimeLogger,
      });
  }

  const primary =
    client
      ? new AiContentProvider({
          client,

          model:
            model ||
            runtimeConfig.model,

          name:
            name ||
            runtimeConfig.provider ||
            "ai",

          metrics,

          logger:
            runtimeLogger,
        })
      : null;

  return new ResilientContentProvider({
    primary,
    fallback,

    logger:
      runtimeLogger,

    metrics,
  });
}

module.exports = {
  createContentProvider,
};
