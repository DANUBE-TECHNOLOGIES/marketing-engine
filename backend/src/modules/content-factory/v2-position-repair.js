"use strict";

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function duplicatePositions(blocks = []) {
  const counts = new Map();
  for (const block of blocks) {
    const position = Number(block?.displayOrder);
    counts.set(position, (counts.get(position) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([position, count]) => ({ position, count }));
}

function fingerprint(blocks = []) {
  return JSON.stringify((blocks || []).map((block) => [block.id, Number(block.displayOrder)]));
}

function proposedBlocks(blocks = []) {
  return (blocks || []).map((block, index) => ({
    id: block.id,
    blockType: block.blockType,
    currentPosition: Number(block.displayOrder),
    nextPosition: index * 10,
  }));
}

function snapshotFor(page) {
  return {
    page: {
      id: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      seoTitle: page.seoTitle,
      metaDescription: page.metaDescription,
      published: page.published,
    },
    blocks: (page.blocks || []).map((block) => ({
      id: block.id,
      type: block.blockType,
      status: block.status,
      position: block.displayOrder,
      content: block.content,
      settings: block.settings,
      seo: block.seo,
      visibleDesktop: block.visibleDesktop,
      visibleMobile: block.visibleMobile,
      version: block.version,
    })),
  };
}

class ContentFactoryV2PositionRepair {
  constructor(prisma) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    this.prisma = prisma;
  }

  async site({ tenantId, siteSlug, pageSlugs }) {
    const scopedTenantId = String(tenantId || "").trim();
    const normalizedSiteSlug = normalize(siteSlug);
    const slugs = [...new Set((Array.isArray(pageSlugs) ? pageSlugs : []).map(normalize).filter(Boolean))];
    if (!scopedTenantId) {
      const error = new Error("tenantId est obligatoire.");
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_TENANT_REQUIRED";
      error.statusCode = 400;
      throw error;
    }
    if (!normalizedSiteSlug) {
      const error = new Error("siteSlug est obligatoire.");
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_SITE_REQUIRED";
      error.statusCode = 400;
      throw error;
    }
    if (!slugs.length) {
      const error = new Error("pageSlugs doit contenir au moins une page.");
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_PAGES_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const site = await this.prisma.agencySite.findUnique({
      where: { tenantId_slug: { tenantId: scopedTenantId, slug: normalizedSiteSlug } },
      select: {
        id: true,
        slug: true,
        name: true,
        pages: {
          where: { slug: { in: slugs } },
          orderBy: { slug: "asc" },
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            published: true,
            seoTitle: true,
            metaDescription: true,
            blocks: {
              orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
              select: {
                id: true,
                blockType: true,
                displayOrder: true,
                status: true,
                content: true,
                settings: true,
                seo: true,
                visibleDesktop: true,
                visibleMobile: true,
                version: true,
              },
            },
          },
        },
      },
    });

    if (!site) {
      const error = new Error("Mini-site introuvable dans ce tenant.");
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const found = new Set((site.pages || []).map((page) => normalize(page.slug)));
    const missing = slugs.filter((slug) => !found.has(slug));
    if (missing.length) {
      const error = new Error(`Pages introuvables : ${missing.join(", ")}.`);
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_PAGE_NOT_FOUND";
      error.statusCode = 404;
      error.details = { missing };
      throw error;
    }

    return { scopedTenantId, site };
  }

  async plan(input = {}) {
    const { scopedTenantId, site } = await this.site(input);
    const candidates = (site.pages || [])
      .map((page) => ({
        page,
        duplicates: duplicatePositions(page.blocks),
      }))
      .filter((item) => item.duplicates.length > 0)
      .map(({ page, duplicates }) => ({
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        duplicatePositions: duplicates,
        blockCount: page.blocks.length,
        sourceFingerprint: fingerprint(page.blocks),
        blocks: proposedBlocks(page.blocks),
      }));

    return {
      ok: true,
      mode: "preview",
      tenantId: scopedTenantId,
      site: { id: site.id, slug: site.slug, name: site.name },
      pagesScanned: site.pages.length,
      candidateCount: candidates.length,
      candidates,
    };
  }

  async apply({ confirm, createdBy = "mse-25.30-v2-position-repair", ...input } = {}) {
    if (confirm !== true) {
      const error = new Error("confirm=true est obligatoire pour appliquer la réparation des positions V2.");
      error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_CONFIRM_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const preview = await this.plan(input);
    if (!preview.candidateCount) return { ...preview, mode: "apply", repairedPages: 0, updatedBlocks: 0, snapshotsCreated: 0 };

    const result = await this.prisma.$transaction(async (tx) => {
      let repairedPages = 0;
      let updatedBlocks = 0;
      let snapshotsCreated = 0;

      for (const candidate of preview.candidates) {
        const page = await tx.agencySitePage.findUnique({
          where: { id: candidate.pageId },
          include: { blocks: { orderBy: [{ displayOrder: "asc" }, { id: "asc" }] } },
        });
        if (!page || fingerprint(page.blocks) !== candidate.sourceFingerprint) {
          const error = new Error(`La page ${candidate.slug} a changé depuis le preview.`);
          error.code = "CONTENT_FACTORY_V2_POSITION_REPAIR_STALE_PREVIEW";
          error.statusCode = 409;
          throw error;
        }

        const aggregate = await tx.agencySitePageVersion.aggregate({
          where: { pageId: page.id },
          _max: { version: true },
        });
        const nextVersion = (aggregate._max.version || 0) + 1;
        await tx.agencySitePageVersion.create({
          data: {
            pageId: page.id,
            version: nextVersion,
            snapshot: snapshotFor(page),
            reason: "mse-25.30-v2-position-repair-snapshot",
            createdBy,
          },
        });
        snapshotsCreated += 1;

        for (const block of candidate.blocks) {
          await tx.pageBlock.update({ where: { id: block.id }, data: { displayOrder: block.nextPosition } });
          updatedBlocks += 1;
        }
        repairedPages += 1;
      }

      return { repairedPages, updatedBlocks, snapshotsCreated };
    });

    return { ...preview, mode: "apply", ...result };
  }
}

module.exports = {
  ContentFactoryV2PositionRepair,
  duplicatePositions,
  fingerprint,
  proposedBlocks,
};
