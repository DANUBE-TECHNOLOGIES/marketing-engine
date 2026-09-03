"use strict";

const DefaultContentBuilder =
  require(
    "./default-content-builder"
  );

const {
  normalizeSectionType,
  decideSectionAction,
} =
  require(
    "./merge-policy"
  );

function existingSectionsMap(
  sections = []
) {
  const map =
    new Map();

  for (
    const section
    of sections ||
    []
  ) {
    const key =
      normalizeSectionType(
        section.sectionType ||
        section.type ||
        section.key
      );

    if (
      !key ||
      map.has(
        key
      )
    ) {
      continue;
    }

    map.set(
      key,
      section
    );
  }

  return map;
}

function normalizePageType(
  page
) {
  const explicit =
    String(
      page?.pageType ||
      page?.type ||
      ""
    )
      .trim()
      .toUpperCase();

  if (explicit) {
    return explicit;
  }

  const slug =
    String(
      page?.slug ??
      ""
    )
      .trim()
      .toLowerCase();

  if (
    slug ===
    ""
  ) {
    return "HOME";
  }

  const mapping = {
    agence:
      "AGENCY",

    services:
      "SERVICES",

    contact:
      "CONTACT",

    "mentions-legales":
      "LEGAL",

    confidentialite:
      "PRIVACY",
  };

  return (
    mapping[
      slug
    ] ||
    slug
      .replace(
        /[^a-z0-9]+/g,
        "_"
      )
      .toUpperCase()
  );
}

class DefaultContentAdapter {
  constructor({
    builder =
      new DefaultContentBuilder(),
  } = {}) {
    this.builder =
      builder;
  }

  buildPlan({
    agency,
    site,
    page,
    existingSections =
      page?.sections ||
      [],
    allowGeneratedRefresh =
      false,
  } = {}) {
    if (!agency) {
      throw Object.assign(
        new Error(
          "Agency requise pour générer le contenu."
        ),
        {
          code:
            "CONTENT_ENGINE_AGENCY_REQUIRED",

          statusCode:
            400,
        }
      );
    }

    if (!page) {
      throw Object.assign(
        new Error(
          "Page requise pour générer le contenu."
        ),
        {
          code:
            "CONTENT_ENGINE_PAGE_REQUIRED",

          statusCode:
            400,
        }
      );
    }

    const pageType =
      normalizePageType(
        page
      );

    const generated =
      this.builder
        .buildPage(
          {
            ...page,

            pageType,
          },
          agency,
          site ||
          {}
        );

    const existingMap =
      existingSectionsMap(
        existingSections
      );

    const operations =
      [];

    for (
      const generatedSection
      of generated.sections ||
      []
    ) {
      const sectionType =
        normalizeSectionType(
          generatedSection
            .sectionType
        );

      const existingSection =
        existingMap.get(
          sectionType
        ) ||
        null;

      const decision =
        decideSectionAction({
          existingSection,
          generatedSection,
          allowGeneratedRefresh,
        });

      operations.push({
        sectionType,

        action:
          decision.action,

        reason:
          decision.reason,

        existingSectionId:
          existingSection?.id ||
          null,

        generatedSection:
          decision.action ===
            "preserve"
            ? null
            : generatedSection,
      });
    }

    return {
      version:
        "1.0",

      page: {
        id:
          page.id ||
          null,

        slug:
          page.slug ??
          null,

        pageType,
      },

      seo:
        generated.seo,

      operations,

      summary:
        operations.reduce(
          (
            acc,
            operation
          ) => {
            acc.total +=
              1;

            if (
              operation.action ===
              "create"
            ) {
              acc.create +=
                1;
            } else if (
              operation.action ===
              "refresh"
            ) {
              acc.refresh +=
                1;
            } else if (
              operation.action ===
              "preserve"
            ) {
              acc.preserve +=
                1;
            } else {
              acc.ignore +=
                1;
            }

            return acc;
          },
          {
            total:
              0,

            create:
              0,

            refresh:
              0,

            preserve:
              0,

            ignore:
              0,
          }
        ),
    };
  }

  buildSitePlan({
    agency,
    site,
    allowGeneratedRefresh =
      false,
  } = {}) {
    if (!site) {
      throw Object.assign(
        new Error(
          "Site requis pour générer un plan de contenu."
        ),
        {
          code:
            "CONTENT_ENGINE_SITE_REQUIRED",

          statusCode:
            400,
        }
      );
    }

    const pages =
      [];

    for (
      const page
      of site.pages ||
      []
    ) {
      const plan =
        this.buildPlan({
          agency,
          site,
          page,
          existingSections:
            page.sections ||
            [],
          allowGeneratedRefresh,
        });

      /*
       * Les pages sans générateur général restent hors plan.
       */
      if (
        plan.summary.total ===
        0
      ) {
        continue;
      }

      pages.push(
        plan
      );
    }

    return {
      version:
        "1.0",

      agency: {
        id:
          agency?.id ||
          null,

        name:
          agency?.name ||
          null,

        city:
          agency?.city ||
          null,
      },

      site: {
        id:
          site.id ||
          null,

        slug:
          site.slug ||
          null,
      },

      pages,

      summary:
        pages.reduce(
          (
            acc,
            page
          ) => {
            acc.pages +=
              1;

            acc.create +=
              page.summary.create;

            acc.refresh +=
              page.summary.refresh;

            acc.preserve +=
              page.summary.preserve;

            return acc;
          },
          {
            pages:
              0,

            create:
              0,

            refresh:
              0,

            preserve:
              0,
          }
        ),
    };
  }
}

module.exports = {
  DefaultContentAdapter,
  existingSectionsMap,
  normalizePageType,
};
