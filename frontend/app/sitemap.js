import {
  fetchMiniSiteSitemap,
} from "../lib/minisite-structured-data/client";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

const PUBLIC_ORIGIN =
  String(
    process.env
      .NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).replace(
    /\/+$/g,
    ""
  );

const NON_INDEXABLE_PAGE_SLUGS = new Set([
  "mentions-legales",
  "mentions_legales",
  "confidentialite",
  "politique-de-confidentialite",
  "privacy",
  "demande-devis",
]);

const INDEXABLE_NESTED_ROUTE_PREFIXES = new Set([
  "destination",
  "inspiration",
]);

function normalizePath(value) {
  let pathname = String(value || "").trim();
  if (!pathname) return null;

  try {
    if (/^https?:\/\//i.test(pathname)) pathname = new URL(pathname).pathname;
  } catch {
    return null;
  }

  if (!pathname.startsWith("/")) pathname = `/${pathname}`;
  pathname = pathname.replace(/^\/sites\/([^/]+)/, "/agence/$1");
  pathname = pathname.replace(/\/{2,}/g, "/");
  pathname = pathname.replace(/^(\/agence\/[^/]+)\/(?:home|accueil|index)$/i, "$1");
  pathname = pathname.replace(/^(\/agence\/[^/]+)\/inspirations$/i, "$1/inspiration");
  if (pathname.length > 1 && pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return pathname;
}

function isIndexablePublicPath(pathname) {
  const parts = String(pathname || "")
    .split("/")
    .filter(Boolean);

  if (parts[0] !== "agence") return false;

  if (parts.length === 1) return true;

  if (!parts[1]) return false;

  if (parts.length === 2) return true;

  if (parts.length === 3) {
    const pageSlug = String(parts[2] || "").trim().toLowerCase();
    return !NON_INDEXABLE_PAGE_SLUGS.has(pageSlug);
  }

  if (parts.length === 4) {
    const routePrefix = String(parts[2] || "").trim().toLowerCase();
    const nestedSlug = String(parts[3] || "").trim();
    return INDEXABLE_NESTED_ROUTE_PREFIXES.has(routePrefix) && Boolean(nestedSlug);
  }

  return false;
}

function canonicalUrl(value) {
  const pathname = normalizePath(value);
  if (!pathname || !isIndexablePublicPath(pathname)) return null;
  return PUBLIC_ORIGIN + pathname;
}

function normalizeDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizePriority(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0.5;
  return Math.min(1, Math.max(0, number));
}

export default async function sitemap() {
  const payload = await fetchMiniSiteSitemap();
  if (payload?.error) throw new Error(`MINISITE_SITEMAP_UNAVAILABLE:${payload.error}`);

  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  const unique = new Map();
  const agencyHubUrl = canonicalUrl("/agence");

  if (agencyHubUrl) {
    unique.set(agencyHubUrl, {
      url: agencyHubUrl,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  for (const entry of entries) {
    const url = canonicalUrl(entry?.url || entry?.path);
    if (!url) continue;

    const normalized = {
      url,
      lastModified: normalizeDate(entry.lastModified || entry.updatedAt || entry.publishedAt),
      changeFrequency: entry.changeFrequency || "monthly",
      priority: normalizePriority(entry.priority),
    };

    const existing = unique.get(url);
    if (
      !existing ||
      (normalized.lastModified && (!existing.lastModified || normalized.lastModified > existing.lastModified))
    ) {
      unique.set(url, normalized);
    }
  }

  return Array.from(unique.values()).sort((left, right) => left.url.localeCompare(right.url));
}

export {
  INDEXABLE_NESTED_ROUTE_PREFIXES,
  NON_INDEXABLE_PAGE_SLUGS,
  canonicalUrl,
  isIndexablePublicPath,
  normalizePath,
};
