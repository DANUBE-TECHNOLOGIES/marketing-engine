"use strict";

const {
  cleanText,
  normalizeSlug,
  pageUrl,
  siteUrl,
} = require("./utils");

function buildBreadcrumbList({
  site,
  page,
  publicOrigin,
} = {}) {
  const rootUrl =
    siteUrl(
      publicOrigin,
      site.slug
    );

  const slug =
    normalizeSlug(
      page.slug
    );

  const items = [
    {
      "@type":
        "ListItem",

      position:
        1,

      name:
        "Accueil",

      item:
        rootUrl,
    },
  ];

  if (slug) {
    items.push({
      "@type":
        "ListItem",

      position:
        2,

      name:
        cleanText(
          page.title,
          slug
        ),

      item:
        pageUrl(
          publicOrigin,
          site.slug,
          slug
        ),
    });
  }

  return {
    "@type":
      "BreadcrumbList",

    "@id":
      `${pageUrl(
        publicOrigin,
        site.slug,
        slug
      )}#breadcrumb`,

    itemListElement:
      items,
  };
}

module.exports = {
  buildBreadcrumbList,
};
