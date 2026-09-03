"use strict";

const {
  normalizeBlockType,
  normalizeSlug,
  unique,
} = require("./utils");

function existingPageMap(
  pages = []
) {
  return new Map(
    pages.map(
      (page) => [
        normalizeSlug(
          page.slug
        ),
        page,
      ]
    )
  );
}

function buildPagePlan(
  blueprintPage,
  existingPage
) {
  if (!existingPage) {
    return {
      action:
        "create-page",

      slug:
        normalizeSlug(
          blueprintPage.slug
        ),

      title:
        blueprintPage.title,

      template:
        blueprintPage.template,

      page:
        blueprintPage,

      blockActions:
        blueprintPage.blocks.map(
          (block) => ({
            action:
              "add-block",

            type:
              normalizeBlockType(
                block
              ),

            reason:
              "new-page",

            block,
          })
        ),
    };
  }

  const existingTypes =
    unique(
      (
        existingPage.blocks ||
        []
      )
        .map(
          normalizeBlockType
        )
        .filter(Boolean)
    );

  const blockActions =
    blueprintPage.blocks.map(
      (block) => {
        const type =
          normalizeBlockType(
            block
          );

        if (
          existingTypes.includes(
            type
          )
        ) {
          return {
            action:
              "keep",

            type,

            reason:
              "existing-block-preserved",

            existing:
              true,
          };
        }

        return {
          action:
            "add-block",

          type,

          reason:
            "missing-block",

          block,
        };
      }
    );

  return {
    action:
      blockActions.some(
        (item) =>
          item.action ===
          "add-block"
      )
        ? "enrich-page"
        : "keep-page",

    slug:
      normalizeSlug(
        blueprintPage.slug
      ),

    title:
      existingPage.title ||
      blueprintPage.title,

    template:
      blueprintPage.template,

    pageId:
      existingPage.id,

    existingStatus:
      existingPage.status ||
      null,

    blockActions,
  };
}

function buildPersistencePlan({
  blueprint,
  existingSite,
} = {}) {
  const pages =
    Array.isArray(
      existingSite?.pages
    )
      ? existingSite.pages
      : [];

  const bySlug =
    existingPageMap(
      pages
    );

  const pagePlans =
    blueprint.pages.map(
      (page) =>
        buildPagePlan(
          page,
          bySlug.get(
            normalizeSlug(
              page.slug
            )
          )
        )
    );

  const createPages =
    pagePlans.filter(
      (page) =>
        page.action ===
        "create-page"
    ).length;

  const enrichPages =
    pagePlans.filter(
      (page) =>
        page.action ===
        "enrich-page"
    ).length;

  const keptPages =
    pagePlans.filter(
      (page) =>
        page.action ===
        "keep-page"
    ).length;

  const addBlocks =
    pagePlans.reduce(
      (
        total,
        page
      ) =>
        total +
        page.blockActions.filter(
          (block) =>
            block.action ===
            "add-block"
        ).length,
      0
    );

  const keepBlocks =
    pagePlans.reduce(
      (
        total,
        page
      ) =>
        total +
        page.blockActions.filter(
          (block) =>
            block.action ===
            "keep"
        ).length,
      0
    );

  return {
    mode:
      "dry-run",

    destructive:
      false,

    overwrite:
      false,

    site: {
      id:
        existingSite?.id ||
        null,

      slug:
        existingSite?.slug ||
        blueprint.site.slug,

      status:
        existingSite?.status ||
        "draft",
    },

    blueprint:
      blueprint.blueprint,

    summary: {
      blueprintPages:
        blueprint.pages.length,

      existingPages:
        pages.length,

      createPages,

      enrichPages,

      keptPages,

      addBlocks,

      keepBlocks,

      totalActions:
        createPages +
        addBlocks,
    },

    pages:
      pagePlans,
  };
}

module.exports = {
  buildPagePlan,
  buildPersistencePlan,
  existingPageMap,
};
