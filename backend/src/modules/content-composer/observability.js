"use strict";

function safeError(
  error
) {
  return {
    name:
      error?.name ||
      "Error",

    code:
      error?.code ||
      null,

    statusCode:
      error?.statusCode ||
      null,

    message:
      error?.message ||
      "Unknown error",
  };
}

class ContentComposerLogger {
  constructor({
    logPrompts =
      false,
    logResponses =
      false,
  } = {}) {
    this.logPrompts =
      logPrompts;

    this.logResponses =
      logResponses;
  }

  emit(
    event,
    payload =
      {}
  ) {
    console.log(
      JSON.stringify({
        channel:
          "content-composer",

        event,

        timestamp:
          new Date().toISOString(),

        ...payload,
      })
    );
  }

  request({
    provider,
    model,
    pageType,
    agencyId,
    prompt,
  }) {
    this.emit(
      "provider.request",
      {
        provider,
        model,
        pageType,
        agencyId,

        prompt:
          this.logPrompts
            ? prompt
            : undefined,

        promptLength:
          typeof prompt ===
          "string"
            ? prompt.length
            : 0,
      }
    );
  }

  success({
    provider,
    model,
    durationMs,
    usage,
    response,
  }) {
    this.emit(
      "provider.success",
      {
        provider,
        model,
        durationMs,

        usage:
          usage ||
          null,

        response:
          this.logResponses
            ? response
            : undefined,
      }
    );
  }

  failure({
    provider,
    model,
    durationMs,
    error,
  }) {
    this.emit(
      "provider.failure",
      {
        provider,
        model,
        durationMs,

        error:
          safeError(
            error
          ),
      }
    );
  }

  fallback({
    reason,
  }) {
    this.emit(
      "provider.fallback",
      {
        reason,
      }
    );
  }
}

module.exports = {
  ContentComposerLogger,
  safeError,
};
