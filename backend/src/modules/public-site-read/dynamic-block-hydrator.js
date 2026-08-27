"use strict";

const {
  OFFER_ASSET_TYPES,
  toPublicOfferCard,
} = require("../campaign-manager/public-offer-card");

const DEFAULT_INSPIRATION_CHANNELS = Object.freeze([
  "inspiration",
  "article",
  "blog",
  "travel-guide",
  "destination-guide",
  "landing-page",
]);

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function cleanReferences(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .filter((entry) => {
      if (seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
}

function normalizeLimit(value, fallback = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").toLowerCase();
}

function isPublicBlock(block) {
  const status = String(block?.status || "").trim().toLowerCase();
  if (!status) return true;
  return ["published", "publish", "visible", "live", "online", "active"].includes(status);
}

function filterPublicBlocks(pages = []) {
  return pages.map((page) => ({
    ...page,
    blocks: Array.isArray(page?.blocks) ? page.blocks.filter(isPublicBlock) : [],
  }));
}

function destinationCard(destination) {
  return {
    id: destination.id,
    slug: destination.slug,
    title: destination.name,
    name: destination.name,
    eyebrow: destination.country || destination.region || null,
    description: destination.summary || destination.tagline || null,
    image: destination.heroImageUrl || null,
    country: destination.country || null,
    region: destination.region || null,
  };
}

function destinationMediaKeys(item) {
  if (!item || typeof item !== "object") return [];
  return [
    item.id,
    item.slug,
    item.title,
    item.name,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);
}

function destinationMediaIndex(content) {
  const index = new Map();
  for (const collection of [content?.destinations, content?.items]) {
    if (!Array.isArray(collection)) continue;
    for (const item of collection) {
      for (const key of destinationMediaKeys(item)) {
        if (!index.has(key)) index.set(key, item);
      }
    }
  }
  return index;
}

function preservedDestinationMedia(item, index) {
  for (const key of destinationMediaKeys(item)) {
    if (index.has(key)) return index.get(key);
  }
  return null;
}

function mergeDestinationMedia(item, previous) {
  if (!previous || typeof previous !== "object") return item;

  const previousImage =
    (typeof previous.image === "string" ? previous.image : null) ||
    previous.imageUrl ||
    previous.heroImageUrl ||
    previous.backgroundImage ||
    previous.coverImage ||
    previous.photoUrl ||
    previous.media?.url ||
    null;

  const image = item.image || previousImage || null;

  return {
    ...previous,
    ...item,
    ...(image ? { image, imageUrl: item.imageUrl || previous.imageUrl || image } : {}),
    imageAssetId:
      item.imageAssetId ||
      previous.imageAssetId ||
      previous.heroImageAssetId ||
      previous.mediaAssetId ||
      previous.coverAssetId ||
      undefined,
    imageAlt: item.imageAlt || previous.imageAlt || previous.alt || undefined,
  };
}

function reviewCard(review) {
  return {
    id: review.id,
    author: review.authorName || "Client Mondescale",
    rating: Number(review.rating) || 5,
    text: review.comment || "",
  };
}

function inspirationCard(content) {
  const body = asObject(content?.body);
  const seo = asObject(content?.seo);
  const image =
    body.heroImageUrl ||
    body.imageUrl ||
    body.image ||
    seo.imageUrl ||
    seo.image ||
    null;

  return {
    id: content.id,
    slug: content.slug || null,
    title: content.title,
    description:
      content.excerpt ||
      body.excerpt ||
      body.summary ||
      body.description ||
      null,
    image,
    category:
      body.category ||
      seo.category ||
      content.channel ||
      null,
    channel: content.channel,
    publishedAt: content.publishedAt || null,
  };
}

const offerCard = toPublicOfferCard;

function destinationConfig(block) {
  const content = asObject(block?.content);
  const references = cleanReferences(content.destinationIds);
  const source = String(
    content.source ||
      content.__dataSource ||
      (references.length ? "manual" : "automatic")
  ).trim().toLowerCase();
  const selectionMode = String(
    content.selectionMode ||
      (references.length ? "manual" : "automatic")
  ).trim().toLowerCase();

  return {
    content,
    references,
    source,
    selectionMode,
    limit: normalizeLimit(content.limit),
  };
}

function collectDestinationPlan(pages = []) {
  const references = [];
  const seen = new Set();
  let automaticLimit = 0;

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "destinations") continue;
      const config = destinationConfig(block);

      if (config.references.length && config.selectionMode !== "automatic") {
        for (const reference of config.references) {
          if (seen.has(reference)) continue;
          seen.add(reference);
          references.push(reference);
        }
        continue;
      }

      if (["travel-core", "catalog", "automatic", "auto"].includes(config.source) || config.selectionMode === "automatic") {
        automaticLimit = Math.max(automaticLimit, config.limit);
      }
    }
  }

  return { references, automaticLimit };
}

function collectDestinationReferences(pages = []) {
  return collectDestinationPlan(pages).references;
}

function inspirationConfig(block) {
  const content = asObject(block?.content);
  const references = cleanReferences(content.contentIds);
  const source = String(
    content.source || content.__dataSource || "content-generation"
  ).trim().toLowerCase();
  const channels = cleanReferences(content.channels);

  return {
    content,
    references,
    source,
    channels: channels.length ? channels : [...DEFAULT_INSPIRATION_CHANNELS],
    limit: normalizeLimit(content.limit),
  };
}

function collectInspirationPlan(pages = []) {
  const references = [];
  const channels = new Set();
  const seen = new Set();
  let automaticLimit = 0;

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "inspirations") continue;
      const config = inspirationConfig(block);

      for (const channel of config.channels) channels.add(channel);

      if (config.references.length && config.source === "manual") {
        for (const reference of config.references) {
          if (seen.has(reference)) continue;
          seen.add(reference);
          references.push(reference);
        }
      } else if (["content-generation", "automatic", "auto", "seo-content"].includes(config.source)) {
        automaticLimit = Math.max(automaticLimit, config.limit);
      }
    }
  }

  return {
    references,
    channels: [...channels],
    automaticLimit,
  };
}

function collectOfferReferences(pages = []) {
  const references = [];
  const seen = new Set();
  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "offers") continue;
      const content = asObject(block.content);
      if (String(content.source || "manual").toLowerCase() !== "manual") continue;
      for (const reference of cleanReferences(content.offerIds)) {
        if (seen.has(reference)) continue;
        seen.add(reference);
        references.push(reference);
      }
    }
  }
  return references;
}

function automaticCampaignOfferLimit(pages = []) {
  let limit = 0;
  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "offers") continue;
      const content = asObject(block.content);
      const source = String(content.source || "manual").toLowerCase();
      if (!["campaign", "automatic", "auto"].includes(source)) continue;
      limit = Math.max(limit, normalizeLimit(content.limit));
    }
  }
  return limit;
}

function isGoogleReviewBlock(block) {
  const type = blockType(block);
  const content = asObject(block?.content);
  const settings = asObject(block?.settings);
  if (type === "testimonials") {
    return String(content.source || "google").toLowerCase() === "google";
  }
  if (type === "reviews") {
    const source = String(
      content.source || settings.__dataSource || settings.dataSource || "google-reviews"
    ).toLowerCase();
    return ["google", "google-reviews"].includes(source);
  }
  return false;
}

function googleReviewLimit(pages = []) {
  let limit = 0;
  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isGoogleReviewBlock(block)) continue;
      const content = asObject(block.content);
      limit = Math.max(limit, normalizeLimit(content.limit));
    }
  }
  return limit;
}

async function loadPublishedDestinations({ prisma, tenantId, references = [], limit = 0 }) {
  const ids = cleanReferences(references);
  if (!prisma?.destination || !tenantId || (!ids.length && !limit)) return [];

  return prisma.destination.findMany({
    where: {
      tenantId,
      status: "published",
      ...(ids.length
        ? {
            OR: [
              { id: { in: ids } },
              { slug: { in: ids } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: ids.length ? Math.min(ids.length, 100) : normalizeLimit(limit),
  });
}

async function loadPublishedInspirations({
  prisma,
  tenantId,
  references = [],
  channels = DEFAULT_INSPIRATION_CHANNELS,
  limit = 0,
}) {
  const ids = cleanReferences(references);
  const allowedChannels = cleanReferences(channels);

  if (!prisma?.seoContent || !tenantId || (!ids.length && !limit)) return [];

  return prisma.seoContent.findMany({
    where: {
      tenantId,
      status: "published",
      publishedAt: { not: null },
      ...(allowedChannels.length
        ? { channel: { in: allowedChannels } }
        : {}),
      ...(ids.length
        ? {
            OR: [
              { id: { in: ids } },
              { slug: { in: ids } },
            ],
          }
        : {}),
    },
    orderBy: [
      { publishedAt: "desc" },
      { updatedAt: "desc" },
    ],
    take: ids.length ? Math.min(ids.length, 100) : normalizeLimit(limit),
  });
}

async function loadApprovedCampaignOffers({ prisma, tenantId, agencyId, references = [], limit = 24 }) {
  const numericAgencyId = Number(agencyId);
  const ids = cleanReferences(references);
  if (!prisma?.campaignAsset || !tenantId || !Number.isInteger(numericAgencyId) || (!ids.length && !limit)) return [];

  return prisma.campaignAsset.findMany({
    where: {
      ...(ids.length ? { id: { in: ids } } : {}),
      status: "approved",
      type: { in: [...OFFER_ASSET_TYPES] },
      campaign: {
        tenantId,
        agencies: { some: { agencyId: numericAgencyId } },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: ids.length ? Math.min(ids.length, 24) : normalizeLimit(limit),
  });
}

async function loadGoogleReviews({ prisma, agencyId, limit }) {
  if (!prisma?.googleReview || !agencyId || !limit) return [];
  return prisma.googleReview.findMany({
    where: {
      agencyId,
      comment: { not: null },
      publishedAt: { not: null },
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

function hydrateDestinationBlocks(pages, manualDestinations = [], automaticDestinations = []) {
  const byReference = new Map();
  for (const destination of manualDestinations) {
    byReference.set(String(destination.id), destination);
    byReference.set(String(destination.slug), destination);
  }
  const automaticCards = automaticDestinations.map(destinationCard);

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "destinations") return block;
      const config = destinationConfig(block);
      const mediaIndex = destinationMediaIndex(config.content);

      const resolved = config.references.length && config.selectionMode !== "automatic"
        ? config.references
            .map((reference) => byReference.get(String(reference)))
            .filter(Boolean)
            .slice(0, config.limit)
            .map(destinationCard)
        : automaticCards.slice(0, config.limit);

      const withPreservedMedia = resolved.map((item) =>
        mergeDestinationMedia(item, preservedDestinationMedia(item, mediaIndex))
      );

      return {
        ...block,
        content: {
          ...config.content,
          destinations: withPreservedMedia,
          items: withPreservedMedia,
        },
      };
    }),
  }));
}

function hydrateInspirationBlocks(pages, manualContents = [], automaticContents = []) {
  const byReference = new Map();
  for (const content of manualContents) {
    byReference.set(String(content.id), content);
    if (content.slug) byReference.set(String(content.slug), content);
  }
  const automaticCards = automaticContents.map(inspirationCard);

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "inspirations") return block;
      const config = inspirationConfig(block);
      const resolved = config.references.length && config.source === "manual"
        ? config.references
            .map((reference) => byReference.get(String(reference)))
            .filter(Boolean)
            .slice(0, config.limit)
            .map(inspirationCard)
        : automaticCards.slice(0, config.limit);

      return {
        ...block,
        content: {
          ...config.content,
          inspirations: resolved,
          articles: resolved,
          items: resolved,
        },
      };
    }),
  }));
}

function hydrateOfferBlocks(pages, manualAssets = [], automaticAssets = []) {
  const manualById = new Map(manualAssets.map((asset) => [asset.id, asset]));
  const automaticCards = automaticAssets.map(offerCard).filter(Boolean);
  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "offers") return block;
      const content = asObject(block.content);
      const source = String(content.source || "manual").toLowerCase();
      const limit = normalizeLimit(content.limit);
      const offers = ["campaign", "automatic", "auto"].includes(source)
        ? automaticCards.slice(0, limit)
        : cleanReferences(content.offerIds)
            .map((reference) => manualById.get(reference))
            .filter(Boolean)
            .map(offerCard)
            .filter(Boolean)
            .slice(0, limit);
      return { ...block, content: { ...content, offers } };
    }),
  }));
}

function hydrateGoogleReviewBlocks(pages, reviews) {
  const items = reviews.map(reviewCard);
  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isGoogleReviewBlock(block)) return block;
      const content = asObject(block.content);
      const limit = normalizeLimit(content.limit);
      const type = blockType(block);
      if (type === "reviews") {
        return {
          ...block,
          content: {
            ...content,
            reviews: reviews.slice(0, limit),
            items: items.slice(0, limit),
          },
        };
      }
      return { ...block, content: { ...content, items: items.slice(0, limit) } };
    }),
  }));
}

async function hydratePublicDynamicBlocks({ prisma, tenantId, agencyId, pages = [], includeUnpublishedBlocks = false } = {}) {
  if (!Array.isArray(pages) || !pages.length) return [];

  const sourcePages = includeUnpublishedBlocks ? pages : filterPublicBlocks(pages);
  const destinationPlan = collectDestinationPlan(sourcePages);
  const inspirationPlan = collectInspirationPlan(sourcePages);
  const offerReferences = collectOfferReferences(sourcePages);
  const automaticOfferLimit = automaticCampaignOfferLimit(sourcePages);
  const reviewLimit = googleReviewLimit(sourcePages);

  if (
    !destinationPlan.references.length &&
    !destinationPlan.automaticLimit &&
    !inspirationPlan.references.length &&
    !inspirationPlan.automaticLimit &&
    !offerReferences.length &&
    !automaticOfferLimit &&
    !reviewLimit
  ) {
    return sourcePages;
  }

  const [
    manualDestinations,
    automaticDestinations,
    manualInspirations,
    automaticInspirations,
    manualOffers,
    automaticOffers,
    reviews,
  ] = await Promise.all([
    loadPublishedDestinations({
      prisma,
      tenantId,
      references: destinationPlan.references,
      limit: destinationPlan.references.length,
    }),
    destinationPlan.automaticLimit
      ? loadPublishedDestinations({
          prisma,
          tenantId,
          limit: destinationPlan.automaticLimit,
        })
      : [],
    inspirationPlan.references.length
      ? loadPublishedInspirations({
          prisma,
          tenantId,
          references: inspirationPlan.references,
          channels: inspirationPlan.channels,
          limit: inspirationPlan.references.length,
        })
      : [],
    inspirationPlan.automaticLimit
      ? loadPublishedInspirations({
          prisma,
          tenantId,
          channels: inspirationPlan.channels,
          limit: inspirationPlan.automaticLimit,
        })
      : [],
    loadApprovedCampaignOffers({
      prisma,
      tenantId,
      agencyId,
      references: offerReferences,
      limit: offerReferences.length,
    }),
    automaticOfferLimit
      ? loadApprovedCampaignOffers({ prisma, tenantId, agencyId, limit: automaticOfferLimit })
      : [],
    loadGoogleReviews({ prisma, agencyId, limit: reviewLimit }),
  ]);

  const withDestinations = destinationPlan.references.length || destinationPlan.automaticLimit
    ? hydrateDestinationBlocks(sourcePages, manualDestinations, automaticDestinations)
    : sourcePages;

  const withInspirations = inspirationPlan.references.length || inspirationPlan.automaticLimit
    ? hydrateInspirationBlocks(withDestinations, manualInspirations, automaticInspirations)
    : withDestinations;

  const withOffers = offerReferences.length || automaticOfferLimit
    ? hydrateOfferBlocks(withInspirations, manualOffers, automaticOffers)
    : withInspirations;

  return reviewLimit ? hydrateGoogleReviewBlocks(withOffers, reviews) : withOffers;
}

module.exports = {
  DEFAULT_INSPIRATION_CHANNELS,
  asObject,
  cleanReferences,
  normalizeLimit,
  blockType,
  isPublicBlock,
  filterPublicBlocks,
  destinationCard,
  destinationMediaKeys,
  destinationMediaIndex,
  preservedDestinationMedia,
  mergeDestinationMedia,
  reviewCard,
  inspirationCard,
  offerCard,
  destinationConfig,
  collectDestinationPlan,
  collectDestinationReferences,
  inspirationConfig,
  collectInspirationPlan,
  collectOfferReferences,
  automaticCampaignOfferLimit,
  isGoogleReviewBlock,
  googleReviewLimit,
  loadPublishedDestinations,
  loadPublishedInspirations,
  loadApprovedCampaignOffers,
  loadGoogleReviews,
  hydrateDestinationBlocks,
  hydrateInspirationBlocks,
  hydrateOfferBlocks,
  hydrateGoogleReviewBlocks,
  hydratePublicDynamicBlocks,
};
