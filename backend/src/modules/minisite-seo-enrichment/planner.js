"use strict";

const {
  generateSeoMetadata,
} = require("./generator");

function buildSeoPlan({
  sites,
  publicOrigin,
} = {}) {
  const items = [];

  for (
    const site
    of sites || []
  ) {
    for (
      const page
      of site.pages || []
    ) {
      items.push({
        agencyId:
          site.agency?.id,

        agencyName:
          site.agency?.name,

        siteId:
          site.id,

        siteSlug:
          site.slug,

        ...generateSeoMetadata({
          agency:
            site.agency,

          site,

          page,

          publicOrigin,
        }),
      });
    }
  }

  return {
    mode:
      "dry-run",

    persistence:
      false,

    destructive:
      false,

    summary: {
      siteCount:
        (sites || []).length,

      pageCount:
        items.length,

      missingSeoTitles:
        items.filter(
          (item) =>
            item.actions
              .setSeoTitle
        ).length,

      missingMetaDescriptions:
        items.filter(
          (item) =>
            item.actions
              .setMetaDescription
        ).length,

      canonicalsPlanned:
        items.filter(
          (item) =>
            item.actions
              .setCanonical
        ).length,

      indexedPages:
        items.filter(
          (item) =>
            item.generated
              .robots
              .index
        ).length,

      noindexPages:
        items.filter(
          (item) =>
            !item.generated
              .robots
              .index
        ).length,

      writeActions:
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            Number(
              item.actions
                .setSeoTitle
            ) +
            Number(
              item.actions
                .setMetaDescription
            ),
          0
        ),
    },

    items,
  };
}

module.exports = {
  buildSeoPlan,
};
