"use strict";

const {
  buildBreadcrumbList,
} = require("./breadcrumbs");

const {
  buildFaqPage,
} = require("./faq");

const {
  buildTravelAgency,
} = require("./travel-agency");

const {
  buildWebPage,
  buildWebSite,
} = require("./webpage");

const {
  removeEmpty,
  stableClone,
} = require("./utils");

const {
  validateGraph,
} = require("./validation");

function buildStructuredDataPlan({
  sites,
  publicOrigin,
} = {}) {
  const items = [];

  for (
    const site
    of sites || []
  ) {
    const graph = [
      buildTravelAgency({
        agency:
          site.agency,

        site,

        publicOrigin,
      }),

      buildWebSite({
        agency:
          site.agency,

        site,

        publicOrigin,
      }),
    ];

    const pages = [];

    for (
      const page
      of site.pages || []
    ) {
      const pageNodes = [
        buildWebPage({
          agency:
            site.agency,

          site,

          page,

          publicOrigin,
        }),

        buildBreadcrumbList({
          site,

          page,

          publicOrigin,
        }),
      ];

      const faq =
        buildFaqPage({
          site,

          page,

          publicOrigin,
        });

      if (faq) {
        pageNodes.push(
          faq
        );
      }

      graph.push(
        ...pageNodes
      );

      pages.push({
        pageId:
          page.id,

        slug:
          page.slug,

        nodeCount:
          pageNodes.length,

        hasFaq:
          Boolean(faq),

        graph:
          pageNodes,
      });
    }

    const cleanGraph =
      removeEmpty(
        graph
      );

    const validation =
      validateGraph(
        cleanGraph
      );

    items.push({
      agencyId:
        site.agency?.id,

      agencyName:
        site.agency?.name,

      siteId:
        site.id,

      siteSlug:
        site.slug,

      graphId:
        `${site.slug}:structured-data:v1`,

      validation,

      summary: {
        nodeCount:
          cleanGraph.length,

        pageCount:
          pages.length,

        faqPageCount:
          pages.filter(
            (page) =>
              page.hasFaq
          ).length,

        issueCount:
          validation.issues.length,
      },

      graph: {
        "@context":
          "https://schema.org",

        "@graph":
          stableClone(
            cleanGraph
          ),
      },

      pages,
    });
  }

  return {
    mode:
      "dry-run",

    persistence:
      false,

    destructive:
      false,

    version:
      "1.0.0",

    publicOrigin,

    summary: {
      siteCount:
        items.length,

      pageCount:
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.summary
              .pageCount,
          0
        ),

      nodeCount:
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.summary
              .nodeCount,
          0
        ),

      faqPageCount:
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.summary
              .faqPageCount,
          0
        ),

      validSites:
        items.filter(
          (item) =>
            item.validation
              .valid
        ).length,

      invalidSites:
        items.filter(
          (item) =>
            !item.validation
              .valid
        ).length,

      issueCount:
        items.reduce(
          (
            total,
            item
          ) =>
            total +
            item.summary
              .issueCount,
          0
        ),
    },

    items,
  };
}

module.exports = {
  buildStructuredDataPlan,
};
