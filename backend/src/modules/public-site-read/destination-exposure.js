"use strict";

const { SectionAwarePublicSiteReadService } = require("./section-aware-service");
const {
  blockType,
  hydratePublicDynamicBlocks,
} = require("./dynamic-block-hydrator");

const DESTINATION_BLOCK_TYPES = new Set([
  "destination-grid",
  "destinations",
  "destinations-highlight",
  "destination-recommendations",
]);

function destinationItems(block) {
  const content = block?.content && typeof block.content === "object"
    ? block.content
    : {};

  const items = [];
  for (const collection of [content.destinations, content.items]) {
    if (Array.isArray(collection)) items.push(...collection);
  }
  return items;
}

function destinationSlugFromItem(item) {
  if (!item || typeof item !== "object") return null;
  const direct = String(item.slug || "").trim();
  if (direct) return direct;

  const href = String(item.href || item.url || "").trim();
  if (!href) return null;
  const match = href.match(/(?:^|\/)destinations?\/([^/?#]+)/i);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]).trim();
  } catch (_error) {
    return match[1].trim();
  }
}

function collectExposedDestinationSlugs(pages = []) {
  const slugs = [];
  const seen = new Set();

  for (const page of pages || []) {
    for (const block of page?.blocks || []) {
      if (!DESTINATION_BLOCK_TYPES.has(blockType(block))) continue;

      for (const item of destinationItems(block)) {
        const slug = destinationSlugFromItem(item);
        if (!slug || seen.has(slug)) continue;
        seen.add(slug);
        slugs.push(slug);
      }
    }
  }

  return slugs;
}

class PublicDestinationExposureResolver {
  constructor(prisma) {
    if (!prisma) throw new Error("Public destination exposure requires Prisma");
    this.prisma = prisma;
    this.siteRead = new SectionAwarePublicSiteReadService({ prisma });
  }

  async resolve(siteSlug, tenantId) {
    const contract = await this.siteRead.bySlug(siteSlug, tenantId);
    const pages = await hydratePublicDynamicBlocks({
      prisma: this.prisma,
      tenantId: contract?.site?.tenantId || tenantId,
      agencyId: contract?.site?.agencyId || contract?.agency?.id || null,
      pages: contract?.pages || [],
      // SectionAwarePublicSiteReadService already resolved publication at page level.
      // Historical V2 blocks can legitimately keep status="draft" on a published page.
      includeUnpublishedBlocks: true,
    });

    return collectExposedDestinationSlugs(pages);
  }

  async exposes(siteSlug, destinationSlug, tenantId) {
    const target = String(destinationSlug || "").trim();
    if (!target) return false;
    const slugs = await this.resolve(siteSlug, tenantId);
    return slugs.includes(target);
  }
}

module.exports = {
  DESTINATION_BLOCK_TYPES,
  PublicDestinationExposureResolver,
  collectExposedDestinationSlugs,
  destinationItems,
  destinationSlugFromItem,
};
