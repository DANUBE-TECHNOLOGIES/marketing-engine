"use strict";
const DeterministicProvider = require("./deterministic-provider");
const OpenAiCompatibleProvider = require("./openai-compatible-provider");

function createProvider(env = process.env) {
  const kind = String(env.AI_CONTENT_PROVIDER || "deterministic").toLowerCase();
  if (kind === "openai" || kind === "openai-compatible") {
    return new OpenAiCompatibleProvider({
      name: kind,
      apiKey: env.AI_CONTENT_API_KEY || env.OPENAI_API_KEY,
      baseUrl: env.AI_CONTENT_BASE_URL || "https://api.openai.com/v1",
      model: env.AI_CONTENT_MODEL || "gpt-4.1-mini",
      timeoutMs: env.AI_CONTENT_TIMEOUT_MS,
    });
  }
  return new DeterministicProvider();
}

module.exports = { createProvider, DeterministicProvider, OpenAiCompatibleProvider };
