"use strict";

const {
  validateGeneratedContent,
} =
  require(
    "./output-contract"
  );

const {
  buildContentComposerPrompt,
} =
  require(
    "./prompt-builder"
  );

const {
  extractProviderOutput,
} =
  require(
    "./provider-response"
  );

class AiContentProvider {
  constructor({
    client,
    model =
      null,
    name =
      "ai",
    metrics =
      null,
    logger =
      null,
  } = {}) {
    if (!client) {
      throw new Error(
        "Client IA obligatoire."
      );
    }

    this.client =
      client;

    this.model =
      model;

    this.name =
      name;

    this.metrics =
      metrics;

    this.logger =
      logger;
  }

  async invoke({
    prompt,
  }) {
    if (
      typeof this.client.generate ===
      "function"
    ) {
      return this.client.generate({
        prompt,
        model:
          this.model,
      });
    }

    if (
      typeof this.client.complete ===
      "function"
    ) {
      return this.client.complete({
        prompt,
        model:
          this.model,
      });
    }

    throw new Error(
      "Le client IA ne possède aucune méthode compatible."
    );
  }

  async generate({
    template,
    context,
    instructions,
  }) {
    const prompt =
      buildContentComposerPrompt({
        pageType:
          template.pageType,

        template,
        context,
        instructions,
      });

    const timer =
      this.metrics?.start({
        provider:
          this.name,

        model:
          this.model,
      }) || {
        startedAt:
          Date.now(),
      };

    this.logger?.request({
      provider:
        this.name,

      model:
        this.model,

      pageType:
        template.pageType,

      agencyId:
        context?.agency?.id,

      prompt,
    });

    try {
      const raw =
        await this.invoke({
          prompt,
        });

      const {
        output,
        usage,
      } =
        extractProviderOutput(
          raw
        );

      let parsed;

      if (
        typeof output ===
        "string"
      ) {
        parsed =
          JSON.parse(
            output
          );
      } else {
        parsed =
          output;
      }

      const validated =
        validateGeneratedContent(
          parsed
        );

      const durationMs =
        this.metrics?.success(
          timer,
          {
            usage,
          }
        ) ??
        (
          Date.now() -
          timer.startedAt
        );

      this.logger?.success({
        provider:
          this.name,

        model:
          this.model,

        durationMs,

        usage,

        response:
          validated,
      });

      return {
        provider:
          this.name,

        model:
          this.model,

        prompt,

        usage,

        sections:
          validated.sections,

        seo:
          validated.seo,
      };
    } catch (
      error
    ) {
      const durationMs =
        this.metrics?.failure(
          timer,
          error
        ) ??
        (
          Date.now() -
          timer.startedAt
        );

      this.logger?.failure({
        provider:
          this.name,

        model:
          this.model,

        durationMs,

        error,
      });

      throw error;
    }
  }
}

module.exports = {
  AiContentProvider,
};
