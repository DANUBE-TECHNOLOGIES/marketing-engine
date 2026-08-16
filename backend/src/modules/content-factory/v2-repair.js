"use strict";

const { pageBlockData } = require("./repository");

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function eligiblePage(page, destinationSlug) {
  const type = normalize(page?.pageType);
  if (!["destination", "destination-cluster"].includes(type)) return false;
  const slug = normalize(page?.slug);
  const destination = normalize(destinationSlug);
  if (destination && slug !== destination && !slug.startsWith(`${destination}-`)) return false;
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  return sections.length > 0 && blocks.length === 0;
}

function repairBlockData(section, page) {
  const block = pageBlockData({
    sectionType: section.sectionType,
    displayOrder: section.displayOrder,
    content: section.jsonContent,
  });
  return {
    ...block,
    status: page?.published === true || normalize(page?.status) === "published"
      ? "published"
      : normalize(section?.status) || "draft",
  };
}

class ContentFactoryV2Repair {
  constructor(prisma) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    this.prisma = prisma;
  }

  async plan({ siteSlug, destinationSlug } = {}) {
    const normalizedSiteSlug = normalize(siteSlug);
    if (!normalizedSiteSlug) {
      const error = new Error("siteSlug est obligatoire.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_SITE_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const site = await this.prisma.agencySite.findUnique({
      where: { slug: normalizedSiteSlug },
      select: {
        id: true,
        slug: true,
        name: true,
        pages: {
          orderBy: { displayOrder: "asc" },
          select: {
            id: true,
            slug: true,
            title: true,
            pageType: true,
            status: true,
            published: true,
            sections: {
              orderBy: { displayOrder: "asc" },
              select: {
                id: true,
                sectionType: true,
                jsonContent: true,
                displayOrder: true,
                status: true,
              },
            },
            blocks: {
              orderBy: { displayOrder: "asc" },
              select: { id: true, blockType: true, displayOrder: true, status: true },
            },
          },
        },
      },
    });

    if (!site) {
      const error = new Error("Mini-site introuvable.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const candidates = (site.pages || [])
      .filter((page) => eligiblePage(page, destinationSlug))
      .map((page) => ({
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        pageType: page.pageType,
        status: page.status,
        published: page.published === true,
        sectionCount: page.sections.length,
        blockCount: page.blocks.length,
        blocksToCreate: page.sections.map((section) => repairBlockData(section, page)),
      }));

    return {
      ok: true,
      mode: "preview",
      site: { id: site.id, slug: site.slug, name: site.name },
      destinationSlug: normalize(destinationSlug) || null,
      pagesScanned: site.pages.length,
      candidateCount: candidates.length,
      blockCount: candidates.reduce((sum, page) => sum + page.blocksToCreate.length, 0),
      candidates,
    };
  }

  async apply({ siteSlug, destinationSlug, confirm } = {}) {
    if (confirm !== true) {
      const error = new Error("confirm=true est obligatoire pour appliquer la réparation V2.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_CONFIRM_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const preview = await this.plan({ siteSlug, destinationSlug });
    if (!preview.candidateCount) {
      return { ...preview, mode: "apply", repairedPages: 0, createdBlocks: 0 };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let repairedPages = 0;
      let createdBlocks = 0;

      for (const candidate of preview.candidates) {
        // Re-check inside the transaction to keep the operation idempotent and
        // avoid overwriting a page that acquired V2 blocks after the preview.
        const currentBlockCount = await tx.pageBlock.count({
          where: { pageId: candidate.pageId },
        });
        if (currentBlockCount > 0) continue;

        if (candidate.blocksToCreate.length > 0) {
          const created = await tx.pageBlock.createMany({
            data: candidate.blocksToCreate.map((block) => ({
              pageId: candidate.pageId,
              ...block,
            })),
          });
          repairedPages += 1;
          createdBlocks += created.count;
        }
      }

      return { repairedPages, createdBlocks };
    });

    return {
      ...preview,
      mode: "apply",
      repairedPages: result.repairedPages,
      createdBlocks: result.createdBlocks,
    };
  }
}

module.exports = {
  ContentFactoryV2Repair,
  eligiblePage,
  repairBlockData,
};
