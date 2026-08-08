"use strict";

const {
  ContentVariablesEngine,
} =
  require(
    "../content-engine/variables"
  );

class TemplateRenderer {
  constructor({
    variablesEngine =
      new ContentVariablesEngine({
        strictRegistry:
          false,
      }),
  } = {}) {
    this.variablesEngine =
      variablesEngine;
  }

  render(
    template,
    context,
    {
      strict =
        false,
    } = {}
  ) {
    if (!template) {
      const error =
        new Error(
          "Template requis."
        );

      error.code =
        "TEMPLATE_REQUIRED";

      error.statusCode =
        400;

      throw error;
    }

    const sections =
      [];

    const variables =
      new Set();

    const missing =
      new Set();

    for (
      const section
      of template.sections ||
      []
    ) {
      const rendered =
        this.variablesEngine
          .renderObject(
            section.content ||
            {},
            context,
            {
              strict,
            }
          );

      for (
        const key
        of rendered.variables
      ) {
        variables.add(
          key
        );
      }

      for (
        const key
        of rendered.missing
      ) {
        missing.add(
          key
        );
      }

      sections.push({
        sectionType:
          section.sectionType,

        displayOrder:
          section.displayOrder,

        content:
          rendered.value,
      });
    }

    const seo =
      template.seo
        ? this.variablesEngine
            .renderObject(
              template.seo,
              context,
              {
                strict,
              }
            )
        : {
            value:
              {},

            variables:
              [],

            missing:
              [],
          };

    for (
      const key
      of seo.variables
    ) {
      variables.add(
        key
      );
    }

    for (
      const key
      of seo.missing
    ) {
      missing.add(
        key
      );
    }

    return {
      template: {
        id:
          template.id,

        version:
          template.version,

        variant:
          template.variant,

        pageType:
          template.pageType,
      },

      sections,

      seo:
        seo.value,

      diagnostics: {
        variables:
          [
            ...variables,
          ],

        missing:
          [
            ...missing,
          ],
      },
    };
  }
}

module.exports = {
  TemplateRenderer,
};
