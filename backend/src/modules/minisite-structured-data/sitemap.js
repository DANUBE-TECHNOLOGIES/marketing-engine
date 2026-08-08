"use strict";

const {
  cleanText,
  normalizeSlug,
  pageUrl,
  siteUrl,
} = require("./utils");

const NOINDEX_SLUGS =
  new Set([
    "mentions-legales",
    "confidentialite",
  ]);

function isPublishedSite(
  site
) {
  return Boolean(
    site &&
    (
      site.status ===
        "published" ||
      site.publishedAt
    )
  );
}

function isPublishedPage(
  page
) {
  if (!page) {
    return false;
  }

  if (
    page.published ===
    true
  ) {
    return true;
  }

  if (
    page.status ===
    "published"
  ) {
    return true;
  }

  return Boolean(
    page.publishedAt
  );
}

function shouldIndexPage(
  page
) {
  const slug =
    normalizeSlug(
      page?.slug
    );

  if (
    NOINDEX_SLUGS.has(
      slug
    )
  ) {
    return false;
  }

  return isPublishedPage(
    page
  );
}

function normalizeDate(
  value
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date
    .toISOString();
}

function pagePriority(
  slug
) {
  const normalized =
    normalizeSlug(slug);

  if (!normalized) {
    return 1;
  }

  if (
    [
      "agence",
      "services",
      "destinations",
      "contact",
    ].includes(
      normalized
    )
  ) {
    return 0.8;
  }

  if (
    [
      "equipe",
      "inspirations",
      "engagements",
      "partenaires",
      "avis",
    ].includes(
      normalized
    )
  ) {
    return 0.6;
  }

  return 0.5;
}

function pageChangeFrequency(
  slug
) {
  const normalized =
    normalizeSlug(slug);

  if (!normalized) {
    return "weekly";
  }

  if (
    [
      "destinations",
      "inspirations",
      "avis",
    ].includes(
      normalized
    )
  ) {
    return "weekly";
  }

  return "monthly";
}

function buildPublicSitemap({
  sites,
  publicOrigin,
} = {}) {
  const entries = [];
  const excluded = [];

  for (
    const site
    of sites || []
  ) {
    if (
      !isPublishedSite(
        site
      )
    ) {
      excluded.push({
        type:
          "site",

        siteId:
          site.id,

        siteSlug:
          site.slug,

        reason:
          "site-not-published",
      });

      continue;
    }

    const publishedPages =
      (
        site.pages ||
        []
      ).filter(
        shouldIndexPage
      );

    const homePage =
      publishedPages.find(
        (page) =>
          normalizeSlug(
            page.slug
          ) === ""
      );

    entries.push({
      url:
        siteUrl(
          publicOrigin,
          site.slug
        ),

      lastModified:
        normalizeDate(
          homePage?.updatedAt ||
          site.updatedAt ||
          site.publishedAt
        ),

      changeFrequency:
        "weekly",

      priority:
        1,

      agencyId:
        site.agency?.id ||
        site.agencyId,

      siteSlug:
        site.slug,

      pageSlug:
        "",
    });

    for (
      const page
      of site.pages || []
    ) {
      const slug =
        normalizeSlug(
          page.slug
        );

      if (!slug) {
        continue;
      }

      if (
        !shouldIndexPage(
          page
        )
      ) {
        excluded.push({
          type:
            "page",

          siteId:
            site.id,

          siteSlug:
            site.slug,

          pageId:
            page.id,

          pageSlug:
            slug,

          reason:
            NOINDEX_SLUGS.has(
              slug
            )
              ? "noindex-page"
              : "page-not-published",
        });

        continue;
      }

      entries.push({
        url:
          pageUrl(
            publicOrigin,
            site.slug,
            slug
          ),

        lastModified:
          normalizeDate(
            page.updatedAt ||
            page.publishedAt ||
            site.updatedAt ||
            site.publishedAt
          ),

        changeFrequency:
          pageChangeFrequency(
            slug
          ),

        priority:
          pagePriority(
            slug
          ),

        agencyId:
          site.agency?.id ||
          site.agencyId,

        siteSlug:
          site.slug,

        pageSlug:
          slug,
      });
    }
  }

  const deduplicated =
    [
      ...new Map(
        entries.map(
          (entry) => [
            cleanText(
              entry.url
            ),
            entry,
          ]
        )
      ).values(),
    ].sort(
      (
        left,
        right
      ) =>
        left.url.localeCompare(
          right.url
        )
    );

  return {
    publicOrigin,

    generatedAt:
      new Date()
        .toISOString(),

    summary: {
      totalSites:
        (sites || []).length,

      publishedSites:
        (
          sites ||
          []
        ).filter(
          isPublishedSite
        ).length,

      entryCount:
        deduplicated.length,

      excludedCount:
        excluded.length,

      duplicateCount:
        entries.length -
        deduplicated.length,
    },

    entries:
      deduplicated,

    excluded,
  };
}

module.exports = {
  NOINDEX_SLUGS,
  buildPublicSitemap,
  isPublishedPage,
  isPublishedSite,
  pageChangeFrequency,
  pagePriority,
  shouldIndexPage,
};
