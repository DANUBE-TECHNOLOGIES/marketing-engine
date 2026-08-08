"use strict";

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
  return String(
    block?.blockType || block?.type || ""
  ).toLowerCase();
}

function destinationCard(destination) {
  return {
    id: destination.id,
    slug: destination.slug,
    title: destination.name,
    name: destination.name,
    eyebrow:
      destination.country ||
      destination.region ||
      null,
    description:
      destination.summary ||
      destination.tagline ||
      null,
    image:
      destination.heroImageUrl ||
      null,
    country:
      destination.country ||
      null,
    region:
      destination.region ||
      null,
  };
}

function reviewCard(review) {
  return {
    id: review.id,
    author:
      review.authorName ||
      "Client Mondescale",
    rating:
      Number(review.rating) || 5,
    text:
      review.comment || "",
  };
}

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

function googleReviewLimit(pages = []) {
  let limit = 0;

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "testimonials") continue;

      const content = asObject(block.content);

      if (String(content.source || "google").toLowerCase() !== "google") {
        continue;
      }

      limit = Math.max(
        limit,
        normalizeLimit(content.limit)
      );
    }
  }

  return limit;
}

async function loadPublishedDestinations({
  prisma,
  tenantId,
  references,
}) {
  if (
    !prisma?.destination ||
    !tenantId ||
    !references.length
  ) {
    return [];
  }

  return prisma.destination.findMany({
    where: {
      tenantId,
      status: "published",
      OR: [
        {
          id: {
            in: references,
          },
        },
        {
          slug: {
            in: references,
          },
        },
      ],
    },
  });
}

async function loadGoogleReviews({
  prisma,
  agencyId,
  limit,
}) {
  if (
    !prisma?.googleReview ||
    !agencyId ||
    !limit
  ) {
    return [];
  }

  return prisma.googleReview.findMany({
    where: {
      agencyId,
      comment: {
        not: null,
      },
      publishedAt: {
        not: null,
      },
    },
    orderBy: [
      {
        publishedAt: "desc",
      },
      {
        createdAt: "desc",
      },
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
      if (blockType(block) !== "destinations") {
        return block;
      }

      const content = asObject(block.content);
      const references = cleanReferences(content.destinationIds);

      if (!references.length) {
        return block;
      }

      const limit = normalizeLimit(content.limit);

      const resolved = references
        .map((reference) => byReference.get(reference))
        .filter(Boolean)
        .slice(0, limit)
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

function hydrateGoogleReviewBlocks(pages, reviews) {
  const items = reviews.map(reviewCard);

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "testimonials") {
        return block;
      }

      const content = asObject(block.content);

      if (String(content.source || "google").toLowerCase() !== "google") {
        return block;
      }

      return {
        ...block,
        content: {
          ...content,
          items:
            items.slice(
              0,
              normalizeLimit(content.limit)
            ),
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
} = {}) {
  if (!Array.isArray(pages) || !pages.length) {
    return [];
  }

  const references = collectDestinationReferences(pages);
  const reviewLimit = googleReviewLimit(pages);

  if (!references.length && !reviewLimit) {
    return pages;
  }

  const [destinations, reviews] = await Promise.all([
    loadPublishedDestinations({
      prisma,
      tenantId,
      references,
    }),
    loadGoogleReviews({
      prisma,
      agencyId,
      limit: reviewLimit,
    }),
  ]);

  const withDestinations =
    references.length
      ? hydrateDestinationBlocks(
          pages,
          destinations
        )
      : pages;

  return reviewLimit
    ? hydrateGoogleReviewBlocks(
        withDestinations,
        reviews
      )
    : withDestinations;
}

module.exports = {
  asObject,
  cleanReferences,
  normalizeLimit,
  blockType,
  destinationCard,
  reviewCard,
  collectDestinationReferences,
  googleReviewLimit,
  loadPublishedDestinations,
  loadGoogleReviews,
  hydrateDestinationBlocks,
  hydrateGoogleReviewBlocks,
  hydratePublicDynamicBlocks,
};
