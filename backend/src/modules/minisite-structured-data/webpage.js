"use strict";

const {
  cleanText,
  pageUrl,
  removeEmpty,
} = require("./utils");

function buildWebPage({
  agency,
  site,
  page,
  publicOrigin,
} = {}) {
  const url =
    pageUrl(
      publicOrigin,
      site.slug,
      page.slug
    );

  return removeEmpty({
    "@type":
      page.slug === ""
        ? "WebPage"
        : "WebPage",

    "@id":
      `${url}#webpage`,

    url,

    name:
      cleanText(
        page.seoTitle ||
        page.title
      ),

    description:
      cleanText(
        page.metaDescription
      ),

    isPartOf: {
      "@id":
        `${siteUrlForReference(
          publicOrigin,
          site.slug
        )}#website`,
    },

    about: {
      "@id":
        `${siteUrlForReference(
          publicOrigin,
          site.slug
        )}#travel-agency`,
    },

    inLanguage:
      "fr-FR",

    breadcrumb: {
      "@id":
        `${url}#breadcrumb`,
    },

    publisher: {
      "@type":
        "Organization",

      name:
        cleanText(
          agency.name
        ),
    },
  });
}

function siteUrlForReference(
  publicOrigin,
  siteSlug
) {
  return [
    String(
      publicOrigin ||
      ""
    ).replace(/\/+$/g, ""),
    "sites",
    String(
      siteSlug ||
      ""
    ).replace(/^\/+|\/+$/g, ""),
  ]
    .filter(Boolean)
    .join("/");
}

function buildWebSite({
  agency,
  site,
  publicOrigin,
} = {}) {
  const url =
    siteUrlForReference(
      publicOrigin,
      site.slug
    );

  return {
    "@type":
      "WebSite",

    "@id":
      `${url}#website`,

    url,

    name:
      cleanText(
        agency.name,
        site.slug
      ),

    inLanguage:
      "fr-FR",

    publisher: {
      "@id":
        `${url}#travel-agency`,
    },
  };
}

module.exports = {
  buildWebPage,
  buildWebSite,
  siteUrlForReference,
};
