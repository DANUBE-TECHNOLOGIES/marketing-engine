"use strict";

const {
  OFFER_ASSET_TYPES,
  toPublicOfferCard,
} = require("../campaign-manager/public-offer-card");

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

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").toLowerCase();
}

function isPublicBlock(block) {
  const status = String(block?.status || "").trim().toLowerCase();

  if (!status) return true;

  return [
    "published",
    "publish",
    "visible",
    "live",
    "online",
    "active",
  ].includes(status);
}

function filterPublicBlocks(pages = []) {
  return pages.map((page) => ({
    ...page,
    blocks: Array.isArray(page?.blocks)
      ? page.blocks.filter(isPublicBlock)
      : [],
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

function reviewCard(review) {
  return {
    id: review.id,
    author: review.authorName || "Client Mondescale",
    rating: Number(review.rating) || 5,
    text: review.comment || "",
  };
}

const offerCard = toPublicOfferCard;

function collectDestinationReferences(pages = []) {
  const references = [];
  const seen = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "destinations") continue;
      const content = asObject(block.content);

      for (const reference of cleanReferences(content.destinationIds)) {
        if (seen.has(reference)) continue;
        seen.add(reference);
        references.push(reference);
      }
    }
  }

  return references;
}

function collectOfferReferences(pages = []) {
  const references = [];
  const seen = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "offers") continue;
      const content = asObject(block.content);

      if (String(content.source || "manual").toLowerCase() !== "manual") {
        continue;
      }

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
    return (
      String(content.source || "google").toLowerCase() === "google"
    );
  }

  if (type === "reviews") {
    const source = String(
      content.source ||
      settings.__dataSource ||
      settings.dataSource ||
      "google-reviews"
    ).toLowerCase();

    return [
      "google",
      "google-reviews",
    ].includes(source);
  }

  return false;
}

function googleReviewLimit(pages = []) {
  let limit = 0;

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (!isGoogleReviewBlock(block)) continue;

      const content = asObject(block.content);

      limit = Math.max(
        limit,
        normalizeLimit(content.limit)
      );
    }
  }

  return limit;
}

async function loadPublishedDestinations({ prisma, tenantId, references }) {
  if (!prisma?.destination || !tenantId || !references.length) return [];

  return prisma.destination.findMany({
    where: {
      tenantId,
      status: "published",
      OR: [
        { id: { in: references } },
        { slug: { in: references } },
      ],
    },
  });
}

async function loadApprovedCampaignOffers({
  prisma,
  tenantId,
  agencyId,
  references = [],
  limit = 24,
}) {
  const numericAgencyId = Number(agencyId);
  const ids = cleanReferences(references);

  if (
    !prisma?.campaignAsset ||
    !tenantId ||
    !Number.isInteger(numericAgencyId) ||
    (!ids.length && !limit)
  ) {
    return [];
  }

  return prisma.campaignAsset.findMany({
    where: {
      ...(ids.length ? { id: { in: ids } } : {}),
      status: "approved",
      type: { in: [...OFFER_ASSET_TYPES] },
      campaign: {
        tenantId,
        agencies: {
          some: {
            agencyId: numericAgencyId,
          },
        },
      },
    },
    orderBy: [
      { updatedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: ids.length
      ? Math.min(ids.length, 24)
      : normalizeLimit(limit),
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
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    take: limit,
  });
}

function hydrateDestinationBlocks(pages, destinations) {
  const byReference = new Map();

  for (const destination of destinations) {
    byReference.set(destination.id, destination);
    byReference.set(destination.slug, destination);
  }

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "destinations") return block;

      const content = asObject(block.content);
      const references = cleanReferences(content.destinationIds);
      if (!references.length) return block;

      const resolved = references
        .map((reference) => byReference.get(reference))
        .filter(Boolean)
        .slice(0, normalizeLimit(content.limit))
        .map(destinationCard);

      return {
        ...block,
        content: {
          ...content,
          destinations: resolved,
        },
      };
    }),
  }));
}

function hydrateOfferBlocks(
  pages,
  manualAssets = [],
  automaticAssets = []
) {
  const manualById = new Map(
    manualAssets.map((asset) => [asset.id, asset])
  );
  const automaticCards = automaticAssets
    .map(offerCard)
    .filter(Boolean);

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

      return {
        ...block,
        content: {
          ...content,
          offers,
        },
      };
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

      return {
        ...block,
        content: {
          ...content,
          items: items.slice(0, limit),
        },
      };
    }),
  }));
}

async function hydratePublicDynamicBlocks({
  prisma,
  tenantId,
  agencyId,
  pages = [],
  includeUnpublishedBlocks = false,
} = {}) {
  if (!Array.isArray(pages) || !pages.length) return [];

  const sourcePages = includeUnpublishedBlocks
    ? pages
    : filterPublicBlocks(pages);

  const destinationReferences = collectDestinationReferences(sourcePages);
  const offerReferences = collectOfferReferences(sourcePages);
  const automaticOfferLimit = automaticCampaignOfferLimit(sourcePages);
  const reviewLimit = googleReviewLimit(sourcePages);

  if (
    !destinationReferences.length &&
    !offerReferences.length &&
    !automaticOfferLimit &&
    !reviewLimit
  ) {
    return sourcePages;
  }

  const [destinations, manualOffers, automaticOffers, reviews] =
    await Promise.all([
      loadPublishedDestinations({
        prisma,
        tenantId,
        references: destinationReferences,
      }),
      loadApprovedCampaignOffers({
        prisma,
        tenantId,
        agencyId,
        references: offerReferences,
        limit: offerReferences.length,
      }),
      automaticOfferLimit
        ? loadApprovedCampaignOffers({
            prisma,
            tenantId,
            agencyId,
            limit: automaticOfferLimit,
          })
        : [],
      loadGoogleReviews({
        prisma,
        agencyId,
        limit: reviewLimit,
      }),
    ]);

  const withDestinations = destinationReferences.length
    ? hydrateDestinationBlocks(sourcePages, destinations)
    : sourcePages;

  const withOffers = offerReferences.length || automaticOfferLimit
    ? hydrateOfferBlocks(withDestinations, manualOffers, automaticOffers)
    : withDestinations;

  return reviewLimit
    ? hydrateGoogleReviewBlocks(withOffers, reviews)
    : withOffers;
}

module.exports = {
  asObject,
  cleanReferences,
  normalizeLimit,
  blockType,
  isPublicBlock,
  filterPublicBlocks,
  destinationCard,
  reviewCard,
  offerCard,
  collectDestinationReferences,
  collectOfferReferences,
  automaticCampaignOfferLimit,
  isGoogleReviewBlock,
  googleReviewLimit,
  loadPublishedDestinations,
  loadApprovedCampaignOffers,
  loadGoogleReviews,
  hydrateDestinationBlocks,
  hydrateOfferBlocks,
  hydrateGoogleReviewBlocks,
  hydratePublicDynamicBlocks,
};
