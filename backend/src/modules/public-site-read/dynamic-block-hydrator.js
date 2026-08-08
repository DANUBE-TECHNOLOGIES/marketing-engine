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

function collectDestinationReferences(pages = []) {
  const references = [];
  const seen = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      const type = String(
        block?.blockType || block?.type || ""
      ).toLowerCase();

      if (type !== "destinations") continue;

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

function hydrateDestinationBlocks(pages, destinations) {
  const byReference = new Map();

  for (const destination of destinations) {
    byReference.set(destination.id, destination);
    byReference.set(destination.slug, destination);
  }

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      const type = String(
        block?.blockType || block?.type || ""
      ).toLowerCase();

      if (type !== "destinations") {
        return block;
      }

      const content = asObject(block.content);
      const references = cleanReferences(content.destinationIds);

      if (!references.length) {
        return block;
      }

      const resolved = references
        .map((reference) => byReference.get(reference))
        .filter(Boolean)
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

async function hydratePublicDynamicBlocks({
  prisma,
  tenantId,
  pages = [],
} = {}) {
  if (!Array.isArray(pages) || !pages.length) {
    return [];
  }

  const references = collectDestinationReferences(pages);

  if (!references.length) {
    return pages;
  }

  const destinations = await loadPublishedDestinations({
    prisma,
    tenantId,
    references,
  });

  return hydrateDestinationBlocks(
    pages,
    destinations
  );
}

module.exports = {
  asObject,
  cleanReferences,
  destinationCard,
  collectDestinationReferences,
  loadPublishedDestinations,
  hydrateDestinationBlocks,
  hydratePublicDynamicBlocks,
};
