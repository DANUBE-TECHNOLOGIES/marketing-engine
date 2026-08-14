"use strict";

const { SectionAwarePublicSiteReadService } = require("./section-aware-service");
const {
  blockType,
  hydratePublicDynamicBlocks,
} = require("./dynamic-block-hydrator");

function destinationItems(block) {
  const content = block?.content && typeof block.content === "object"
    ? block.content
    : {};

  if (Array.isArray(content.destinations)) return content.destinations;
  if (Array.isArray(content.items)) return content.items;
  return [];
}

function collectExposedDestinationSlugs(pages = []) {
  const slugs = [];
  const seen = new Set();

  for (const page of pages || []) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "destinations") continue;

      for (const item of destinationItems(block)) {
        const slug = String(item?.slug || "").trim();
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
  PublicDestinationExposureResolver,
  collectExposedDestinationSlugs,
  destinationItems,
};
