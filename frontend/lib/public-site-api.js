import { cache } from "react";
import {
  getPublicHours,
} from "./public-hours-api.js";

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

const SECONDARY_PAGE_INHERITANCE = Object.freeze({
  partenaires: Object.freeze({
    family: "partners",
    types: Object.freeze(["partners", "logos", "partner-logos"]),
  }),
  partners: Object.freeze({
    family: "partners",
    types: Object.freeze(["partners", "logos", "partner-logos"]),
  }),
  equipe: Object.freeze({
    family: "team",
    types: Object.freeze(["team", "equipe", "team-grid", "equipe-grid"]),
  }),
  team: Object.freeze({
    family: "team",
    types: Object.freeze(["team", "equipe", "team-grid", "equipe-grid"]),
  }),
  "notre-equipe": Object.freeze({
    family: "team",
    types: Object.freeze(["team", "equipe", "team-grid", "equipe-grid"]),
  }),
  notre_equipe: Object.freeze({
    family: "team",
    types: Object.freeze(["team", "equipe", "team-grid", "equipe-grid"]),
  }),
  services: Object.freeze({
    family: "services",
    types: Object.freeze(["services", "services-grid", "services-highlight"]),
    collectionKeys: Object.freeze(["items"]),
  }),
  destinations: Object.freeze({
    family: "destinations",
    types: Object.freeze([
      "destinations",
      "destination",
      "destination-grid",
      "destinations-grid",
      "destinations-highlight",
      "destination-recommendations",
    ]),
    collectionKeys: Object.freeze(["destinations", "items", "destinationIds"]),
  }),
});

const GENERIC_TEAM_IDENTITIES = Object.freeze(new Set([
  "equipe",
  "l equipe",
  "notre equipe",
  "votre equipe",
  "conseiller",
  "conseillere",
  "conseiller voyage",
  "conseillere voyage",
  "conseiller voyages",
  "conseillere voyages",
  "expert voyage",
  "experte voyage",
  "expert voyages",
  "experte voyages",
]));

async function requestFrom(basePath, path) {
  const response = await fetch(
    `${INTERNAL_API_URL}${basePath}${path}`,
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

async function request(path) {
  return requestFrom("/api/public-sites", path);
}

async function requestRender(path) {
  return requestFrom("/api/public-render-sites", path);
}

const getContract = cache(async (siteSlug) =>
  requestRender(`/${encodeURIComponent(siteSlug)}`)
);

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

function pagesFromContract(payload) {
  if (Array.isArray(payload?.pages)) return payload.pages;
  if (Array.isArray(payload?.site?.pages)) return payload.site.pages;
  return [];
}

function homeFromContract(payload) {
  const page =
    payload?.home ||
    payload?.homePage ||
    payload?.page ||
    payload?.currentPage ||
    payload?.requestedPage ||
    null;

  return pageFromContract(page);
}

function pageBySlugFromContract(payload, pageSlug) {
  if (isHomeSlug(pageSlug)) return homeFromContract(payload);

  const normalizedSlug = normalizePageSlug(pageSlug);
  const page = pagesFromContract(payload).find(
    (candidate) => normalizePageSlug(candidate?.slug) === normalizedSlug
  );

  return page ? pageFromContract(page) : null;
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

function publicBlockContent(block) {
  if (block?.jsonContent && typeof block.jsonContent === "object") {
    return block.jsonContent;
  }
  if (block?.content && typeof block.content === "object") {
    return block.content;
  }
  return {};
}

function withPublicBlockContent(block, content) {
  if (block?.jsonContent && typeof block.jsonContent === "object") {
    return { ...block, jsonContent: content };
  }
  if (block?.content && typeof block.content === "object") {
    return { ...block, content };
  }
  return { ...block, jsonContent: content };
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

function inheritanceContract(pageSlug) {
  const slug = String(pageSlug || "").trim().toLowerCase();
  return SECONDARY_PAGE_INHERITANCE[slug] || null;
}

function pagePublicBlocks(page) {
  if (Array.isArray(page?.sections)) return page.sections;
  if (Array.isArray(page?.contentBlocks)) return page.contentBlocks;
  if (Array.isArray(page?.blocks)) return page.blocks;
  return [];
}

function normalizeTeamIdentity(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function teamMemberIsMeaningful(member) {
  if (!member || typeof member !== "object") return false;

  const identity = normalizeTeamIdentity(member.name || member.title);

  /*
   * Generated Team placeholders often carry descriptive copy. That copy must
   * never make a generic identity authoritative, otherwise a secondary page
   * containing "Conseiller voyage" blocks inheritance from the populated Home.
   * A named advisor is authoritative. When no identity exists at all, retain
   * support for media/contact-only legacy records.
   */
  if (identity) {
    return !GENERIC_TEAM_IDENTITIES.has(identity);
  }

  return Boolean(
    member.email ||
    member.image ||
    member.imageUrl ||
    member.photo ||
    member.photoUrl
  );
}

function teamBlockMembers(block) {
  const content = publicBlockContent(block);
  return [content.members, content.items, content.team]
    .flatMap((items) => Array.isArray(items) ? items : [])
    .filter(Boolean);
}

function teamBlockHasMembers(block) {
  return teamBlockMembers(block).some(teamMemberIsMeaningful);
}

function collectionValueIsMeaningful(value) {
  if (typeof value === "string") return Boolean(value.trim());
  if (!value || typeof value !== "object") return false;

  return Boolean(
    String(value.title || value.name || value.label || value.slug || value.id || "").trim() ||
    String(value.text || value.description || value.href || value.url || value.image || value.imageUrl || "").trim()
  );
}

function collectionBlockHasData(block, keys = []) {
  const content = publicBlockContent(block);
  return keys.some((key) => {
    const values = content[key];
    return Array.isArray(values) && values.some(collectionValueIsMeaningful);
  });
}

function blockHasAuthoritativeData(block, contract) {
  if (contract.family === "team") return teamBlockHasMembers(block);
  if (Array.isArray(contract.collectionKeys)) {
    return collectionBlockHasData(block, contract.collectionKeys);
  }
  return true;
}

function selectInheritanceSourceBlock(homeBlocks, contract) {
  const typeSet = new Set(contract.types);
  const candidates = homeBlocks.filter((block) => typeSet.has(publicBlockType(block)));

  if (!candidates.length) return null;

  if (contract.family === "team") {
    return candidates.find(teamBlockHasMembers) || candidates[0];
  }

  if (Array.isArray(contract.collectionKeys)) {
    return candidates.find((block) => collectionBlockHasData(block, contract.collectionKeys)) || candidates[0];
  }

  return candidates[0];
}

function mergeInheritedTeamBlock(targetBlock, sourceBlock) {
  const targetContent = publicBlockContent(targetBlock);
  const sourceContent = publicBlockContent(sourceBlock);
  const merged = { ...sourceContent, ...targetContent };

  /*
   * A generated secondary Team page may contain a non-empty placeholder such
   * as "Conseiller voyage". Those rows are presentation scaffolding, not
   * agency data. When the target has no meaningful advisor, the Home remains
   * the canonical populated source and all member collections come from it.
   * Explicit named advisors on the secondary page never reach this branch.
   */
  for (const key of ["members", "items", "team"]) {
    delete merged[key];
  }

  for (const key of ["members", "items", "team"]) {
    const sourceItems = sourceContent[key];
    if (Array.isArray(sourceItems) && sourceItems.length) {
      merged[key] = sourceItems;
    }
  }

  return withPublicBlockContent(targetBlock, merged);
}

function mergeInheritedCollectionBlock(targetBlock, sourceBlock, keys = []) {
  const targetContent = publicBlockContent(targetBlock);
  const sourceContent = publicBlockContent(sourceBlock);
  const merged = { ...sourceContent, ...targetContent };

  for (const key of keys) {
    delete merged[key];
  }

  for (const key of keys) {
    const sourceItems = sourceContent[key];
    if (Array.isArray(sourceItems) && sourceItems.length) {
      merged[key] = sourceItems;
    }
  }

  return withPublicBlockContent(targetBlock, merged);
}

function inheritedDisplayOrder(blocks) {
  const orders = blocks
    .map((block, index) => Number(block?.displayOrder ?? block?.order ?? index))
    .filter(Number.isFinite);
  return (orders.length ? Math.max(...orders) : blocks.length) + 10;
}

function cloneInheritedBlock(sourceBlock, blocks, family) {
  const displayOrder = inheritedDisplayOrder(blocks);
  const clone = {
    ...sourceBlock,
    id: `${sourceBlock?.id || family}-inherited-home`,
    displayOrder,
    presentationOrder: undefined,
  };
  return clone;
}

function inheritSecondaryPageFromHome(page, homePage, pageSlug) {
  const contract = inheritanceContract(pageSlug);
  if (!contract || !page || !homePage) return page;

  const targetBlocks = pagePublicBlocks(page);
  const homeBlocks = pagePublicBlocks(homePage);
  const typeSet = new Set(contract.types);
  const sourceBlock = selectInheritanceSourceBlock(homeBlocks, contract);

  if (!sourceBlock || !blockHasAuthoritativeData(sourceBlock, contract)) return page;

  const targetIndex = targetBlocks.findIndex((block) => typeSet.has(publicBlockType(block)));
  let nextBlocks = targetBlocks;

  if (targetIndex >= 0) {
    if (blockHasAuthoritativeData(targetBlocks[targetIndex], contract)) {
      return page;
    }

    nextBlocks = [...targetBlocks];
    nextBlocks[targetIndex] = contract.family === "team"
      ? mergeInheritedTeamBlock(targetBlocks[targetIndex], sourceBlock)
      : mergeInheritedCollectionBlock(
          targetBlocks[targetIndex],
          sourceBlock,
          contract.collectionKeys || []
        );
  } else {
    nextBlocks = [
      ...targetBlocks,
      cloneInheritedBlock(sourceBlock, targetBlocks, contract.family),
    ];
  }

  return {
    ...page,
    sections: nextBlocks,
    contentBlocks: nextBlocks,
    inheritedHomeContent: contract.family,
  };
}

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

  return pageFromContract(
    await requestRender(
      `/${encodeURIComponent(siteSlug)}/pages/${encodeURIComponent(pageSlug)}`
    )
  );
});

export const publicSiteApi = {
  async getSite(siteSlug) {
    const [site, hours] = await Promise.all([
      getSite(siteSlug),
      getPublicHours(siteSlug).catch(() => null),
    ]);

    if (!site || typeof site !== "object") return site;

    return {
      ...site,
      hours,
    };
  },

  getHome,

  async getPage(siteSlug, pageSlug) {
    const page = await getPage(siteSlug, pageSlug);
    const contract = inheritanceContract(pageSlug);

    if (!contract) {
      return page;
    }

    const homePage = await getHome(siteSlug);

    return inheritSecondaryPageFromHome(
      page,
      homePage,
      pageSlug
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
      await requestRender(`/${encodeURIComponent(siteSlug)}`)
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
  GENERIC_TEAM_IDENTITIES,
  HOME_PRESENTATION_RANK,
  SECONDARY_PAGE_INHERITANCE,
  blockHasAuthoritativeData,
  collectionBlockHasData,
  collectionValueIsMeaningful,
  inheritSecondaryPageFromHome,
  inheritanceContract,
  mergeInheritedCollectionBlock,
  normalizeTeamIdentity,
  pageFromContract,
  pageIsHome,
  publicBlockContent,
  publicBlockType,
  selectInheritanceSourceBlock,
  siteFromContract,
  teamBlockHasMembers,
  teamBlockMembers,
  teamMemberIsMeaningful,
  withHomePresentationOrder,
  homeFromContract,
  pageBySlugFromContract,
  pagesFromContract,
};
