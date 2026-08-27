import { cache } from "react";

const INTERNAL_API_URL =
  process.env.INTERNAL_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const PUBLIC_DATA_REVALIDATE_SECONDS = Math.max(
  30,
  Number(process.env.PUBLIC_SITE_REVALIDATE_SECONDS || 300) || 300
);

function publicFetchOptions() {
  return {
    headers: {
      accept: "application/json",
    },
    next: {
      revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
    },
  };
}

async function request(path) {
  const response = await fetch(
    `${INTERNAL_API_URL}/api/public-sites${path}`,
    publicFetchOptions()
  );

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error = new Error(
      payload?.error?.debug?.message ||
        payload?.error?.message ||
        payload?.message ||
        "Mini-site introuvable"
    );
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

async function requestWebsiteBuilder(path) {
  const response = await fetch(
    `${INTERNAL_API_URL}/api/website-builder${path}`,
    publicFetchOptions()
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message ||
        payload?.error ||
        "Catalogue éditorial indisponible"
    );
    error.statusCode = response.status;
    throw error;
  }

  return payload;
}

function normalizePageSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function isHomeSlug(value) {
  return ["", "home", "accueil", "index"].includes(normalizePageSlug(value));
}

function siteFromContract(payload) {
  const site = payload?.site && typeof payload.site === "object"
    ? payload.site
    : payload;

  if (!site || typeof site !== "object") return site;

  return {
    ...site,
    navigation: payload?.navigation || site.navigation || [],
  };
}

function pageFromContract(payload) {
  const page = payload?.page || payload?.currentPage || payload?.requestedPage || payload;

  if (!page || typeof page !== "object") return page;

  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  /*
   * Blocks V2 are the canonical rendering source. Legacy `sections` may
   * legitimately exist as an empty array on migrated pages; because [] is
   * truthy in JavaScript it used to mask non-empty `blocks` in the public
   * renderer. Whenever V2 blocks exist, expose them as sections as well so
   * all public consumers render the same persisted page as Designer V2.
   */
  if (blocks.length) {
    return {
      ...page,
      sections: blocks,
      contentBlocks: blocks,
    };
  }

  return page;
}

function pagesFromContract(payload) {
  if (Array.isArray(payload?.pages)) return payload.pages;
  if (Array.isArray(payload?.site?.pages)) return payload.site.pages;
  return [];
}

function homeFromContract(payload) {
  const explicitHome = payload?.homePage || payload?.home || null;
  if (explicitHome) return pageFromContract(explicitHome);

  const pages = pagesFromContract(payload);
  const home = pages.find((page) => isHomeSlug(page?.slug)) || pages[0] || null;
  return home ? pageFromContract(home) : pageFromContract(payload);
}

function pageBySlugFromContract(payload, pageSlug) {
  if (isHomeSlug(pageSlug)) return homeFromContract(payload);

  const normalizedSlug = normalizePageSlug(pageSlug);
  const page = pagesFromContract(payload).find(
    (candidate) => normalizePageSlug(candidate?.slug) === normalizedSlug
  );

  return page ? pageFromContract(page) : null;
}

/*
 * MSE-25.71 P0 performance contract
 * ----------------------------------
 * The root public-site response already contains the site, navigation and all
 * published pages. Previously getSite(), getHome() and getPage() each fetched
 * a multi-megabyte compatibility contract independently. During SSR the
 * layout, generateMetadata() and page renderer therefore caused redundant
 * transfers and JSON parsing.
 *
 * Keep one React request-cache entry per site and derive site/page views from
 * that same payload. The underlying fetch still uses Next revalidation, so
 * this changes neither publication freshness nor the external API contract.
 */
const getContract = cache(async (siteSlug) =>
  request(`/${encodeURIComponent(siteSlug)}`)
);

const getSite = cache(async (siteSlug) => siteFromContract(
  await getContract(siteSlug)
));

const getHome = cache(async (siteSlug) => homeFromContract(
  await getContract(siteSlug)
));

const getPage = cache(async (siteSlug, pageSlug) => {
  const contract = await getContract(siteSlug);
  const page = pageBySlugFromContract(contract, pageSlug);

  if (page) return page;

  /*
   * Compatibility fallback for an exceptional backend contract that does not
   * expose its complete page catalogue at the root endpoint.
   */
  return pageFromContract(
    await request(
      `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(pageSlug)}`
    )
  );
});

export const publicSiteApi = {
  getSite,
  getHome,
  getPage,

  async getInspirations({
    limit = 6,
    channel = "article",
    ids = [],
    agencyId = null,
  } = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (channel) params.set("channel", channel);
    if (agencyId !== null && agencyId !== undefined && String(agencyId).trim()) {
      params.set("agencyId", String(agencyId).trim());
    }
    if (Array.isArray(ids) && ids.length) {
      params.set("ids", ids.map(String).join(","));
    }

    const payload = await requestWebsiteBuilder(
      `/inspirations?${params.toString()}`
    );

    return Array.isArray(payload?.items) ? payload.items : [];
  },

  async getInspiration(siteSlug, contentSlug) {
    const site = siteFromContract(await getContract(siteSlug));
    const agencyId = site?.agencyId || site?.agency?.id || null;
    const params = new URLSearchParams();
    if (agencyId !== null && agencyId !== undefined && String(agencyId).trim()) {
      params.set("agencyId", String(agencyId).trim());
    }

    const suffix = params.toString() ? `?${params.toString()}` : "";
    return requestWebsiteBuilder(
      `/inspirations/${encodeURIComponent(contentSlug)}${suffix}`
    );
  },
};

export {
  PUBLIC_DATA_REVALIDATE_SECONDS,
  getContract,
  getHome,
  getPage,
  getSite,
  homeFromContract,
  pageBySlugFromContract,
  pageFromContract,
  pagesFromContract,
  siteFromContract,
};
