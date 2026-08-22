import {
  getPublicHours,
} from "./public-hours-api";

const INTERNAL_API_URL =
  process.env.INTERNAL_FRONTEND_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const HOME_PRESENTATION_RANK = Object.freeze({
  hero: 0,
  features: 10,
  engagements: 10,
  engagement: 10,
  destinations: 20,
  destination: 20,
  "destination-grid": 20,
  "destinations-grid": 20,
  "destinations-highlight": 20,
  "destination-recommendations": 20,
  flexible_payment: 30,
  "flexible-payment": 30,
  services: 40,
  "services-grid": 40,
  "services-highlight": 40,
  team: 50,
  equipe: 50,
  "team-grid": 50,
  "equipe-grid": 50,
  reviews: 60,
  testimonials: 60,
  partners: 70,
  logos: 70,
  "partner-logos": 70,
  contact: 80,
  map: 90,
  faq: 100,
});

async function request(path) {
  const response = await fetch(
    `${INTERNAL_API_URL}/api/public-sites${path}`,
    {
      headers: { accept: "application/json" },
      cache: "no-store",
    }
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
    {
      headers: { accept: "application/json" },
      cache: "no-store",
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message || payload?.error || "Catalogue éditorial indisponible"
    );
    error.statusCode = response.status;
    throw error;
  }

  return payload;
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

function pageIsHome(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function publicBlockType(block) {
  const content = block?.jsonContent || block?.content || {};
  return String(
    content?.__builderType ||
      block?.blockType ||
      block?.sectionType ||
      block?.type ||
      block?.key ||
      ""
  ).trim().toLowerCase();
}

function withHomePresentationOrder(page, blocks) {
  if (!pageIsHome(page)) return blocks;

  return blocks.map((block, index) => {
    const type = publicBlockType(block);
    const rank = HOME_PRESENTATION_RANK[type] ?? 110;
    const storedOrder = Number(block?.displayOrder ?? block?.order ?? index);
    const tieBreaker = Number.isFinite(storedOrder) ? storedOrder : index;

    return {
      ...block,
      presentationOrder: rank * 1000 + tieBreaker,
    };
  });
}

function pageFromContract(payload) {
  const page = payload?.page || payload?.currentPage || payload?.requestedPage || payload;

  if (!page || typeof page !== "object") return page;

  const sections = Array.isArray(page.sections) ? page.sections : [];
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];

  /*
   * Website Designer V2 PageBlock rows are the canonical public rendering
   * source whenever they exist. AgencySiteSection is retained only as the
   * legacy fallback for pages that have not yet been migrated to V2.
   * Presentation order is applied in memory only: stored PageBlock ordering
   * stays untouched in the Website Designer and database.
   */
  if (blocks.length) {
    const publicBlocks = withHomePresentationOrder(page, blocks);
    return {
      ...page,
      sections: publicBlocks,
      contentBlocks: publicBlocks,
    };
  }

  if (sections.length) {
    return {
      ...page,
      sections,
      contentBlocks: sections,
    };
  }

  return page;
}

export const publicSiteApi = {
  async getSite(siteSlug) {
    const [payload, hours] = await Promise.all([
      request(`/${encodeURIComponent(siteSlug)}`),
      getPublicHours(siteSlug).catch(() => null),
    ]);

    const site = siteFromContract(payload);
    if (!site || typeof site !== "object") return site;

    return {
      ...site,
      hours,
    };
  },

  async getHome(siteSlug) {
    return pageFromContract(
      await request(`/${encodeURIComponent(siteSlug)}/pages/home`)
    );
  },

  async getPage(siteSlug, pageSlug) {
    return pageFromContract(
      await request(
        `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(pageSlug)}`
      )
    );
  },

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
    const site = siteFromContract(
      await request(`/${encodeURIComponent(siteSlug)}`)
    );
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
  HOME_PRESENTATION_RANK,
  pageFromContract,
  pageIsHome,
  publicBlockType,
  siteFromContract,
  withHomePresentationOrder,
};
