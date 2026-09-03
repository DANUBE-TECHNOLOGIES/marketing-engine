"use strict";

const {
  DefaultContentAdapter,
} =
  require(
    "../content-engine/default-content"
  );

function databaseSectionsForAdapter(
  sections = []
) {
  return (
    sections ||
    []
  ).map(
    section => ({
      ...section,

      /*
       * AgencySiteSection stocke le contenu sous jsonContent.
       * Le Content Engine raisonne volontairement sur
       * l'abstraction "content".
       */
      content:
        section.content ??
        section.jsonContent ??
        {},
    })
  );
}

class DefaultContentWriter {
  constructor({
    repository,
    adapter =
      new DefaultContentAdapter(),
  } = {}) {
    if (!repository) {
      throw new Error(
        "AgencySiteRepository obligatoire."
      );
    }

    this.repository =
      repository;

    this.adapter =
      adapter;
  }

  async buildPlan({
    agency,
    site,
  } = {}) {
    const normalizedSite = {
      ...site,

      pages:
        (
          site?.pages ||
          []
        ).map(
          page => ({
            ...page,

            sections:
              databaseSectionsForAdapter(
                page.sections
              ),
          })
        ),
    };

    return this.adapter
      .buildSitePlan({
        agency,

        site:
          normalizedSite,

        /*
         * A3 interdit tout refresh.
         */
        allowGeneratedRefresh:
          false,
      });
  }

  async applyPlan(
    plan
  ) {
    if (!plan) {
      throw new Error(
        "Plan de contenu obligatoire."
      );
    }

    const result = {
      pages:
        0,

      operations:
        0,

      created:
        0,

      preserved:
        0,

      ignored:
        0,

      refreshSkipped:
        0,

      details:
        [],
    };

    for (
      const pagePlan
      of plan.pages ||
      []
    ) {
      result.pages +=
        1;

      const pageId =
        pagePlan?.page?.id;

      if (!pageId) {
        continue;
      }

      for (
        const operation
        of pagePlan.operations ||
        []
      ) {
        result.operations +=
          1;

        if (
          operation.action ===
          "preserve"
        ) {
          result.preserved +=
            1;

          result.details.push({
            pageId,

            sectionType:
              operation.sectionType,

            action:
              "preserve",

            reason:
              operation.reason,
          });

          continue;
        }

        if (
          operation.action ===
          "refresh"
        ) {
          /*
           * Même si un plan externe contenait refresh,
           * le writer A3 refuse de l'exécuter.
           */
          result.refreshSkipped +=
            1;

          result.details.push({
            pageId,

            sectionType:
              operation.sectionType,

            action:
              "refresh-skipped",

            reason:
              "CREATE_ONLY_WRITER",
          });

          continue;
        }

        if (
          operation.action !==
          "create"
        ) {
          result.ignored +=
            1;

          continue;
        }

        const generated =
          operation.generatedSection;

        if (!generated) {
          result.ignored +=
            1;

          continue;
        }

        const persisted =
          await this.repository
            .createSectionIfMissing(
              pageId,
              generated
            );

        if (
          persisted.created ===
          true
        ) {
          result.created +=
            1;
        } else {
          /*
           * Une section créée entre le plan et l'écriture
           * devient automatiquement une préservation.
           */
          result.preserved +=
            1;
        }

        result.details.push({
          pageId,

          sectionType:
            operation.sectionType,

          action:
            persisted.created
              ? "created"
              : "preserved",

          reason:
            persisted.reason,

          sectionId:
            persisted.section?.id ||
            null,
        });
      }
    }

    return result;
  }

  async ensure({
    agency,
    site,
  } = {}) {
    const plan =
      await this.buildPlan({
        agency,
        site,
      });

    const result =
      await this.applyPlan(
        plan
      );

    return {
      plan,

      result,
    };
  }
}

module.exports = {
  DefaultContentWriter,
  databaseSectionsForAdapter,
};
