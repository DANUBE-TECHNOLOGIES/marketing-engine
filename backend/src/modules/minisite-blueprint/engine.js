"use strict";

const {
  createBlueprintError,
} = require("./errors");

const {
  stableClone,
} = require("./utils");

const {
  validateAgencyContext,
} = require("./validation");

const {
  breadcrumbsBlock,
  contactBlock,
  ctaBlock,
  destinationsBlock,
  faqBlock,
  heroBlock,
  hoursBlock,
  introBlock,
  legalBlock,
  mapBlock,
  partnersBlock,
  reviewsBlock,
  seoForPage,
  servicesBlock,
  teamBlock,
  uspBlock,
} = require("./blocks");

const BLOCK_FACTORIES = {
  breadcrumbs:
    (
      context,
      page
    ) =>
      breadcrumbsBlock(
        page
      ),

  hero:
    (
      context,
      page
    ) =>
      heroBlock(
        context,
        page
      ),

  intro:
    (
      context,
      page
    ) =>
      introBlock(
        context,
        page
      ),

  usp:
    (
      context
    ) =>
      uspBlock(
        context
      ),

  destinations:
    (
      context
    ) =>
      destinationsBlock(
        context
      ),

  services:
    (
      context
    ) =>
      servicesBlock(
        context
      ),

  team:
    (
      context
    ) =>
      teamBlock(
        context
      ),

  partners:
    (
      context
    ) =>
      partnersBlock(
        context
      ),

  reviews:
    () =>
      reviewsBlock(),

  faq:
    (
      context,
      page
    ) =>
      faqBlock(
        page
      ),

  contact:
    (
      context
    ) =>
      contactBlock(
        context
      ),

  map:
    (
      context
    ) =>
      mapBlock(
        context
      ),

  hours:
    () =>
      hoursBlock(),

  cta:
    (
      context,
      page
    ) =>
      ctaBlock(
        page
      ),

  legal:
    (
      context
    ) =>
      legalBlock(
        context,
        "legal"
      ),

  privacy:
    (
      context
    ) =>
      legalBlock(
        context,
        "privacy"
      ),
};

function buildBlock(
  type,
  context,
  page,
  position
) {
  const factory =
    BLOCK_FACTORIES[
      type
    ];

  if (!factory) {
    throw createBlueprintError(
      `Type de bloc inconnu : ${type}.`,
      "BLUEPRINT_BLOCK_UNKNOWN",
      500
    );
  }

  return {
    ...factory(
      context,
      page
    ),

    position,
  };
}

function buildNavigation(
  pages
) {
  return {
    primary:
      pages
        .filter(
          (page) =>
            page.menu ===
            "primary"
        )
        .map(
          (page) => ({
            label:
              page.title,

            href:
              page.slug
                ? `/${page.slug}`
                : "/",

            order:
              page.priority,
          })
        ),

    secondary:
      pages
        .filter(
          (page) =>
            page.menu ===
            "secondary"
        )
        .map(
          (page) => ({
            label:
              page.title,

            href:
              `/${page.slug}`,

            order:
              page.priority,
          })
        ),

    footer:
      pages
        .filter(
          (page) =>
            page.menu ===
            "footer"
        )
        .map(
          (page) => ({
            label:
              page.title,

            href:
              `/${page.slug}`,

            order:
              page.priority,
          })
        ),
  };
}

function buildInternalLinks(
  page,
  pages
) {
  const universal = [
    "contact",
    "services",
    "destinations",
  ];

  return pages
    .filter(
      (candidate) =>
        candidate.slug !==
        page.slug
    )
    .filter(
      (candidate) =>
        universal.includes(
          candidate.slug
        ) ||
        candidate.menu ===
          page.menu
    )
    .slice(
      0,
      6
    )
    .map(
      (candidate) => ({
        label:
          candidate.title,

        href:
          candidate.slug
            ? `/${candidate.slug}`
            : "/",
      })
    );
}

class MiniSiteBlueprintEngine {
  constructor({
    registry,
  } = {}) {
    if (!registry) {
      throw createBlueprintError(
        "Le registre de blueprints est obligatoire.",
        "BLUEPRINT_REGISTRY_REQUIRED",
        500
      );
    }

    this.registry =
      registry;
  }

  compose(
    input = {}
  ) {
    const context =
      validateAgencyContext(
        input
      );

    const blueprint =
      this.registry.get(
        context.blueprint
      );

    if (
      !context.partners.length &&
      blueprint.defaults
        ?.partners
    ) {
      context.partners = [
        ...blueprint
          .defaults
          .partners,
      ];
    }

    const pages =
      blueprint.pages.map(
        (definition) => {
          const blocks =
            definition.blocks.map(
              (
                type,
                position
              ) =>
                buildBlock(
                  type,
                  context,
                  definition,
                  position
                )
            );

          return {
            key:
              definition.key,

            slug:
              definition.slug,

            path:
              definition.slug
                ? `/${definition.slug}`
                : "/",

            title:
              definition.title,

            template:
              definition.template,

            menu:
              definition.menu,

            priority:
              definition.priority,

            status:
              "draft",

            published:
              false,

            seo:
              seoForPage(
                context,
                definition
              ),

            blocks,

            internalLinks: [],
          };
        }
      );

    for (
      const page
      of pages
    ) {
      page.internalLinks =
        buildInternalLinks(
          page,
          pages
        );
    }

    return stableClone({
      blueprint: {
        id:
          blueprint.id,

        version:
          blueprint.version,

        name:
          blueprint.name,
      },

      agency: {
        id:
          context.agencyId,

        name:
          context.agencyName,

        city:
          context.city,

        siteSlug:
          context.siteSlug,
      },

      site: {
        slug:
          context.siteSlug,

        status:
          "draft",

        theme:
          blueprint.theme,

        navigation:
          buildNavigation(
            blueprint.pages
          ),
      },

      summary: {
        pageCount:
          pages.length,

        blockCount:
          pages.reduce(
            (
              total,
              page
            ) =>
              total +
              page.blocks.length,
            0
          ),

        requiredBlockCount:
          pages.reduce(
            (
              total,
              page
            ) =>
              total +
              page.blocks.filter(
                (block) =>
                  block.required
              ).length,
            0
          ),

        templates:
          [
            ...new Set(
              pages.map(
                (page) =>
                  page.template
              )
            ),
          ],
      },

      pages,
    });
  }
}

module.exports = {
  BLOCK_FACTORIES,
  MiniSiteBlueprintEngine,
  buildBlock,
  buildInternalLinks,
  buildNavigation,
};
