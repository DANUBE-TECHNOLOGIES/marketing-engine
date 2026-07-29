import { absoluteUrl } from "../lib/seo/site-url";
import {
  getPublishedAgencySitesForSeo,
  getPublishedDestinationsForSeo,
} from "../lib/seo/public-seo-api";

export const dynamic = "force-dynamic";

function validDate(value) {
  if (!value) {
    return new Date();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeSitePath(site) {
  if (site?.basePath) {
    return site.basePath;
  }

  if (site?.slug) {
    return `/agence/${site.slug}`;
  }

  return null;
}

function normalizePagePath(sitePath, page) {
  if (page?.path) {
    return page.path;
  }

  if (!page?.slug) {
    return sitePath;
  }

  return `${sitePath}/${page.slug}`;
}

export default async function sitemap() {
  const [sites, destinations] = await Promise.all([
    getPublishedAgencySitesForSeo(),
    getPublishedDestinationsForSeo(),
  ]);

  const entries = [
    {
      url: absoluteUrl("/"),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const site of sites) {
    const sitePath = normalizeSitePath(site);

    if (!sitePath) {
      continue;
    }

    entries.push({
      url: absoluteUrl(sitePath),
      lastModified: validDate(site.updatedAt || site.publishedAt),
      changeFrequency: "weekly",
      priority: 0.9,
    });

    const pages = Array.isArray(site.pages) ? site.pages : [];

    for (const page of pages) {
      if (page.published === false || page.status === "draft") {
        continue;
      }

      const path = normalizePagePath(sitePath, page);

      entries.push({
        url: absoluteUrl(path),
        lastModified: validDate(page.updatedAt || page.publishedAt),
        changeFrequency: "monthly",
        priority: page.pageType === "home" ? 0.9 : 0.7,
      });
    }

    for (const destination of destinations) {
      if (!destination?.slug) {
        continue;
      }

      entries.push({
        url: absoluteUrl(
          `${sitePath}/destination/${destination.slug}`
        ),
        lastModified: validDate(
          destination.updatedAt || destination.publishedAt
        ),
        changeFrequency: "monthly",
        priority: 0.8,
      });
    }
  }

  const uniqueEntries = new Map();

  for (const entry of entries) {
    uniqueEntries.set(entry.url, entry);
  }

  return Array.from(uniqueEntries.values());
}
