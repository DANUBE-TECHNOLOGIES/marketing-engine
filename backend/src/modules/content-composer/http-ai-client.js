"use strict";

function runtimeError(
  message,
  code,
  {
    cause,
    statusCode =
      502,
  } = {}
) {
  const error =
    new Error(
      message,
      cause
        ? {
            cause,
          }
        : undefined
    );

  error.code =
    code;

  error.statusCode =
    statusCode;

  return error;
}

function sleep(
  ms
) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
}

class HttpAiClient {
  constructor({
    baseUrl,
    apiKey,
    timeoutMs =
      30000,
    retries =
      1,
    retryDelayMs =
      500,
    maxOutputTokens =
      2500,
    metrics =
      null,
    logger =
      null,
  } = {}) {
    if (!baseUrl) {
      throw new Error(
        "CONTENT_AI_BASE_URL obligatoire."
      );
    }

    this.baseUrl =
      baseUrl;

    this.apiKey =
      apiKey ||
      null;

    this.timeoutMs =
      timeoutMs;

    this.retries =
      retries;

    this.retryDelayMs =
      retryDelayMs;

    this.maxOutputTokens =
      maxOutputTokens;

    this.metrics =
      metrics;

    this.logger =
      logger;
  }

  headers() {
    const headers = {
      "content-type":
        "application/json",
    };

    if (
      this.apiKey
    ) {
      headers.authorization =
        `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  payload({
    prompt,
    model,
  }) {
    return {
      model,

      prompt,

      max_output_tokens:
        this.maxOutputTokens,

      response_format: {
        type:
          "json_object",
      },
    };
  }

  async request({
    prompt,
    model,
  }) {
    let lastError;

    for (
      let attempt = 0;
      attempt <=
      this.retries;
      attempt += 1
    ) {
      if (
        attempt >
        0
      ) {
        this.metrics?.retry();

        await sleep(
          this.retryDelayMs *
          attempt
        );
      }

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          this.timeoutMs
        );

      try {
        const response =
          await fetch(
            this.baseUrl,
            {
              method:
                "POST",

              headers:
                this.headers(),

              body:
                JSON.stringify(
                  this.payload({
                    prompt,
                    model,
                  })
                ),

              signal:
                controller.signal,
            }
          );

        const text =
          await response.text();

        if (
          !response.ok
        ) {
          const error =
            runtimeError(
              `Provider HTTP ${response.status}`,
              "AI_PROVIDER_HTTP_ERROR",
              {
                statusCode:
                  502,
              }
            );

          error.providerStatus =
            response.status;

          error.providerBody =
            text.slice(
              0,
              1000
            );

          throw error;
        }

        let body;

        try {
          body =
            JSON.parse(
              text
            );
        } catch (
          parseError
        ) {
          throw runtimeError(
            "Réponse provider non JSON.",
            "AI_PROVIDER_INVALID_JSON",
            {
              cause:
                parseError,
            }
          );
        }

        return body;
      } catch (
        error
      ) {
        if (
          error?.name ===
          "AbortError"
        ) {
          lastError =
            runtimeError(
              "Timeout provider IA.",
              "AI_PROVIDER_TIMEOUT",
              {
                cause:
                  error,
              }
            );
        } else {
          lastError =
            error;
        }

        if (
          attempt >=
          this.retries
        ) {
          throw lastError;
        }
      } finally {
        clearTimeout(
          timeout
        );
      }
    }

    throw (
      lastError ||
      runtimeError(
        "Provider IA indisponible.",
        "AI_PROVIDER_FAILURE"
      )
    );
  }

  async generate({
    prompt,
    model,
  }) {
    return this.request({
      prompt,
      model,
    });
  }
}

module.exports = {
  HttpAiClient,
  runtimeError,
};
