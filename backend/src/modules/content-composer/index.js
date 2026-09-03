"use strict";

/*
 * MONDESCALE CONTENT COMPOSER
 *
 * Façade publique unique.
 *
 * Important :
 * tous les exports des briques internes sont agrégés ici afin
 * d'éviter qu'une évolution d'un sous-module reste inaccessible
 * via :
 *
 * require("../src/modules/content-composer")
 */

const service =
  require(
    "./service"
  );

const apiRouter =
  require(
    "./api-router"
  );

const deterministicProvider =
  require(
    "./deterministic-provider"
  );

const aiProvider =
  require(
    "./ai-provider"
  );

const resilientProvider =
  require(
    "./resilient-provider"
  );

const providerFactory =
  require(
    "./provider-factory"
  );

const httpAiClient =
  require(
    "./http-ai-client"
  );

const runtimeConfig =
  require(
    "./runtime-config"
  );

const metrics =
  require(
    "./metrics"
  );

const observability =
  require(
    "./observability"
  );

const outputContract =
  require(
    "./output-contract"
  );

const promptBuilder =
  require(
    "./prompt-builder"
  );

const contextBuilder =
  require(
    "./context-builder"
  );

const providerResponse =
  require(
    "./provider-response"
  );

const contract =
  require(
    "./contract"
  );

const textUtils =
  require(
    "./text-utils"
  );

const factualSafety =
  require(
    "./factual-safety"
  );

const duplication =
  require(
    "./duplication"
  );

const seoScorer =
  require(
    "./seo-scorer"
  );

const qualityGuard =
  require(
    "./quality-guard"
  );

module.exports = {
  ...service,
  ...apiRouter,
  ...deterministicProvider,
  ...aiProvider,
  ...resilientProvider,
  ...providerFactory,
  ...httpAiClient,
  ...runtimeConfig,
  ...metrics,
  ...observability,
  ...outputContract,
  ...promptBuilder,
  ...contextBuilder,
  ...providerResponse,
  ...contract,
  ...textUtils,
  ...factualSafety,
  ...duplication,
  ...seoScorer,
  ...qualityGuard,
};
