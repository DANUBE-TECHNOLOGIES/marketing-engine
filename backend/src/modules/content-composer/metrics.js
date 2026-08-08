"use strict";

class ContentComposerMetrics {
  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      requests:
        0,

      success:
        0,

      failures:
        0,

      fallbacks:
        0,

      retries:
        0,

      timeoutFailures:
        0,

      promptTokens:
        0,

      completionTokens:
        0,

      totalTokens:
        0,

      totalDurationMs:
        0,

      lastRequestAt:
        null,

      lastSuccessAt:
        null,

      lastFailureAt:
        null,

      lastProvider:
        null,

      lastModel:
        null,

      lastFailureCode:
        null,
    };
  }

  start({
    provider,
    model,
  } = {}) {
    this.state.requests +=
      1;

    this.state.lastRequestAt =
      new Date().toISOString();

    this.state.lastProvider =
      provider ||
      null;

    this.state.lastModel =
      model ||
      null;

    return {
      startedAt:
        Date.now(),
    };
  }

  success(
    timer,
    {
      usage,
      fallbackUsed =
        false,
    } = {}
  ) {
    const duration =
      Date.now() -
      timer.startedAt;

    this.state.success +=
      1;

    this.state.totalDurationMs +=
      duration;

    this.state.lastSuccessAt =
      new Date().toISOString();

    if (fallbackUsed) {
      this.state.fallbacks +=
        1;
    }

    if (usage) {
      this.state.promptTokens +=
        Number(
          usage.promptTokens ||
          usage.inputTokens ||
          0
        );

      this.state.completionTokens +=
        Number(
          usage.completionTokens ||
          usage.outputTokens ||
          0
        );

      this.state.totalTokens +=
        Number(
          usage.totalTokens ||
          (
            Number(
              usage.promptTokens ||
              usage.inputTokens ||
              0
            ) +
            Number(
              usage.completionTokens ||
              usage.outputTokens ||
              0
            )
          )
        );
    }

    return duration;
  }

  failure(
    timer,
    error
  ) {
    const duration =
      Date.now() -
      timer.startedAt;

    this.state.failures +=
      1;

    this.state.totalDurationMs +=
      duration;

    this.state.lastFailureAt =
      new Date().toISOString();

    this.state.lastFailureCode =
      error?.code ||
      error?.name ||
      "UNKNOWN";

    if (
      error?.code ===
      "AI_PROVIDER_TIMEOUT"
    ) {
      this.state.timeoutFailures +=
        1;
    }

    return duration;
  }

  retry() {
    this.state.retries +=
      1;
  }

  snapshot() {
    const requests =
      this.state.requests;

    return {
      ...this.state,

      averageDurationMs:
        requests >
        0
          ? Math.round(
              this.state.totalDurationMs /
              requests
            )
          : 0,
    };
  }
}

const contentComposerMetrics =
  new ContentComposerMetrics();

module.exports = {
  ContentComposerMetrics,
  contentComposerMetrics,
};
