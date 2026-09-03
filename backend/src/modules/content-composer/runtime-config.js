"use strict";

function integer(
  value,
  fallback,
  {
    min =
      0,
    max =
      Number.MAX_SAFE_INTEGER,
  } = {}
) {
  const number =
    Number(
      value
    );

  if (
    !Number.isInteger(
      number
    )
  ) {
    return fallback;
  }

  return Math.min(
    Math.max(
      number,
      min
    ),
    max
  );
}

function boolean(
  value,
  fallback =
    false
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return fallback;
  }

  return [
    "1",
    "true",
    "yes",
    "on",
  ].includes(
    String(
      value
    )
      .trim()
      .toLowerCase()
  );
}

function createAiRuntimeConfig(
  env =
    process.env
) {
  const provider =
    String(
      env.CONTENT_AI_PROVIDER ||
      ""
    )
      .trim()
      .toLowerCase();

  return {
    enabled:
      boolean(
        env.CONTENT_AI_ENABLED,
        false
      ),

    provider:
      provider ||
      null,

    model:
      String(
        env.CONTENT_AI_MODEL ||
        ""
      ).trim() ||
      null,

    baseUrl:
      String(
        env.CONTENT_AI_BASE_URL ||
        ""
      ).trim() ||
      null,

    apiKey:
      String(
        env.CONTENT_AI_API_KEY ||
        ""
      ).trim() ||
      null,

    timeoutMs:
      integer(
        env.CONTENT_AI_TIMEOUT_MS,
        30000,
        {
          min:
            1000,

          max:
            120000,
        }
      ),

    retries:
      integer(
        env.CONTENT_AI_RETRIES,
        1,
        {
          min:
            0,

          max:
            3,
        }
      ),

    retryDelayMs:
      integer(
        env.CONTENT_AI_RETRY_DELAY_MS,
        500,
        {
          min:
            100,

          max:
            10000,
        }
      ),

    maxOutputTokens:
      integer(
        env.CONTENT_AI_MAX_OUTPUT_TOKENS,
        2500,
        {
          min:
            256,

          max:
            16000,
        }
      ),

    logPrompts:
      boolean(
        env.CONTENT_AI_LOG_PROMPTS,
        false
      ),

    logResponses:
      boolean(
        env.CONTENT_AI_LOG_RESPONSES,
        false
      ),
  };
}

module.exports = {
  createAiRuntimeConfig,
  boolean,
  integer,
};
