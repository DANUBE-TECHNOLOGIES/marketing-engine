"use strict";

const {
  createBuiltinTemplateRegistry,
} =
  require(
    "./builtins"
  );

const {
  TemplateRenderer,
} =
  require(
    "./renderer"
  );

class TemplateLibraryService {
  constructor({
    registry =
      createBuiltinTemplateRegistry(),

    renderer =
      new TemplateRenderer(),
  } = {}) {
    this.registry =
      registry;

    this.renderer =
      renderer;
  }

  health() {
    return {
      module:
        "template-library",

      version:
        "1.0",

      templates:
        this.registry.count(),
    };
  }

  list(
    filters = {}
  ) {
    return this.registry
      .list(
        filters
      )
      .map(
        template => ({
          id:
            template.id,

          name:
            template.name,

          pageType:
            template.pageType,

          variant:
            template.variant,

          version:
            template.version,

          status:
            template.status,

          scope:
            template.scope,

          tags:
            template.tags ||
            [],
        })
      );
  }

  get(
    id,
    version
  ) {
    return this.registry
      .get(
        id,
        version
      );
  }

  defaultForPage(
    pageType
  ) {
    return this.registry
      .latest({
        pageType,

        variant:
          "default",

        status:
          "active",
      });
  }

  renderDefault(
    pageType,
    context,
    options = {}
  ) {
    const template =
      this.defaultForPage(
        pageType
      );

    if (!template) {
      const error =
        new Error(
          `Aucun template actif pour ${pageType}`
        );

      error.code =
        "DEFAULT_TEMPLATE_NOT_FOUND";

      error.statusCode =
        404;

      throw error;
    }

    return this.renderer
      .render(
        template,
        context,
        options
      );
  }
}

module.exports = {
  TemplateLibraryService,
};
