"use strict";

class ResilientContentProvider {
  constructor({
    primary,
    fallback,
    logger =
      null,
    metrics =
      null,
  } = {}) {
    if (!fallback) {
      throw new Error(
        "Provider fallback obligatoire."
      );
    }

    this.primary =
      primary ||
      null;

    this.fallback =
      fallback;

    this.logger =
      logger;

    this.metrics =
      metrics;
  }

  async generate(
    input
  ) {
    if (
      this.primary
    ) {
      try {
        const result =
          await this.primary
            .generate(
              input
            );

        return {
          ...result,

          fallbackUsed:
            false,

          fallbackReason:
            null,
        };
      } catch (
        error
      ) {
        const reason =
          error?.code ||
          error?.message ||
          "AI_PROVIDER_FAILURE";

        this.logger?.fallback({
          reason,
        });

        const fallback =
          await this.fallback
            .generate(
              input
            );

        /*
         * Le primary enregistre déjà l'échec.
         * On enregistre uniquement le nombre de fallbacks ici.
         */
        if (
          this.metrics?.state
        ) {
          this.metrics.state.fallbacks +=
            1;
        }

        return {
          ...fallback,

          fallbackUsed:
            true,

          fallbackReason:
            reason,
        };
      }
    }

    const fallback =
      await this.fallback
        .generate(
          input
        );

    if (
      this.metrics?.state
    ) {
      this.metrics.state.fallbacks +=
        1;
    }

    this.logger?.fallback({
      reason:
        "AI_PROVIDER_NOT_CONFIGURED",
    });

    return {
      ...fallback,

      fallbackUsed:
        true,

      fallbackReason:
        "AI_PROVIDER_NOT_CONFIGURED",
    };
  }
}

module.exports = {
  ResilientContentProvider,
};
