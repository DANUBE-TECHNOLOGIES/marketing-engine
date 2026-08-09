import {
  getPublicHours,
} from "./public-hours-api";

const INTERNAL_API_URL =
  process.env.INTERNAL_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

async function request(path) {
  const response = await fetch(
    `${INTERNAL_API_URL}/api/public-sites${path}`,
    {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  const payload = contentType.includes(
    "application/json"
  )
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
    {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    }
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

function siteFromContract(payload) {
  const site =
    payload?.site &&
    typeof payload.site === "object"
      ? payload.site
      : payload;

  if (
    !site ||
    typeof site !== "object"
  ) {
    return site;
  }

  return {
    ...site,
    navigation:
      payload?.navigation ||
      site.navigation ||
      [],
  };
}

function pageFromContract(payload) {
  return (
    payload?.page ||
    payload?.currentPage ||
    payload?.requestedPage ||
    payload
  );
}

export const publicSiteApi = {
  async getSite(siteSlug) {
    const [payload, hours] = await Promise.all([
      request(
        `/${encodeURIComponent(siteSlug)}`
      ),
      getPublicHours(siteSlug).catch(() => null),
    ]);

    const site = siteFromContract(payload);

    if (!site || typeof site !== "object") {
      return site;
    }

    return {
      ...site,
      hours,
    };
  },

  async getHome(siteSlug) {
    return pageFromContract(
      await request(
        `/${encodeURIComponent(siteSlug)}/pages/home`
      )
    );
  },

  async getPage(siteSlug, pageSlug) {
    return pageFromContract(
      await request(
        `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(
          pageSlug
        )}`
      )
    );
  },

  async getInspirations({
    limit = 6,
    channel = "article",
    ids = [],
  } = {}) {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (channel) params.set("channel", channel);
    if (Array.isArray(ids) && ids.length) {
      params.set("ids", ids.map(String).join(","));
    }

    const payload = await requestWebsiteBuilder(
      `/inspirations?${params.toString()}`
    );

    return Array.isArray(payload?.items)
      ? payload.items
      : [];
  },
};

export {
  pageFromContract,
  siteFromContract,
};
