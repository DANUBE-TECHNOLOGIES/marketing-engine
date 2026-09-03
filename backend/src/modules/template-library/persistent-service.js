"use strict";

const {
  TemplateLibraryService,
} =
  require(
    "./service"
  );

const {
  TemplateLibraryRepository,
} =
  require(
    "./repository"
  );

class PersistentTemplateLibraryService {
  constructor({
    prisma,
    repository =
      prisma
        ? new TemplateLibraryRepository(
            prisma
          )
        : null,

    builtinService =
      new TemplateLibraryService(),
  } = {}) {
    if (!repository) {
      throw new Error(
        "TemplateLibraryRepository obligatoire."
      );
    }

    this.repository =
      repository;

    this.builtinService =
      builtinService;
  }

  async resolve({
    tenantId =
      null,

    agencyId =
      null,

    pageType,

    variant =
      "default",
  }) {
    if (
      agencyId !==
        null &&
      agencyId !==
        undefined
    ) {
      const assignment =
        await this.repository
          .findAssignment({
            scope:
              "agency",

            tenantId,

            agencyId,

            pageType,

            variant,
          });

      if (
        assignment
          ?.template
      ) {
        return {
          source:
            "agency",

          assignment,

          template:
            assignment
              .template
              .definition,
        };
      }
    }

    if (tenantId) {
      const assignment =
        await this.repository
          .findAssignment({
            scope:
              "tenant",

            tenantId,

            agencyId:
              null,

            pageType,

            variant,
          });

      if (
        assignment
          ?.template
      ) {
        return {
          source:
            "tenant",

          assignment,

          template:
            assignment
              .template
              .definition,
        };
      }
    }

    const platform =
      await this.repository
        .findAssignment({
          scope:
            "platform",

          tenantId:
            null,

          agencyId:
            null,

          pageType,

          variant,
        });

    if (
      platform
        ?.template
    ) {
      return {
        source:
          "platform",

        assignment:
          platform,

        template:
          platform
            .template
            .definition,
      };
    }

    const builtin =
      this.builtinService
        .defaultForPage(
          pageType
        );

    if (!builtin) {
      const error =
        new Error(
          `Aucun template disponible pour ${pageType}.`
        );

      error.code =
        "TEMPLATE_NOT_FOUND";

      error.statusCode =
        404;

      throw error;
    }

    return {
      source:
        "builtin",

      assignment:
        null,

      template:
        builtin,
    };
  }

  createTemplate({
    definition,
    tenantId =
      null,
    agencyId =
      null,
    scope =
      "tenant",
    createdBy =
      null,
  }) {
    return this.repository
      .createDefinition({
        templateKey:
          definition.id,

        name:
          definition.name,

        description:
          definition.description,

        kind:
          definition.kind,

        pageType:
          definition.pageType,

        variant:
          definition.variant,

        version:
          definition.version,

        status:
          definition.status,

        scope,

        tenantId,

        agencyId,

        definition,

        tags:
          definition.tags ||
          [],

        metadata: {
          source:
            "template-library",
        },

        createdBy,
      });
  }

  assign(
    input
  ) {
    return this.repository
      .setAssignment(
        input
      );
  }
}

module.exports = {
  PersistentTemplateLibraryService,
};
