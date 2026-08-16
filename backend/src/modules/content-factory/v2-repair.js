"use strict";

const { pageBlockData } = require("./repository");

const LEGACY_UNSUPPORTED_TYPES = new Set(["overview", "highlights", "practical"]);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function destinationPage(page, destinationSlug) {
  const type = normalize(page?.pageType);
  if (!["destination", "destination-cluster"].includes(type)) return false;
  const slug = normalize(page?.slug);
  const destination = normalize(destinationSlug);
  return !destination || slug === destination || slug.startsWith(`${destination}-`);
}

function exactLegacyCopy(page = {}) {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const blocks = Array.isArray(page.blocks) ? page.blocks : [];
  if (!sections.length || sections.length !== blocks.length) return false;
  let containsUnsupportedLegacyType = false;
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const block = blocks[index];
    const sectionType = normalize(section?.sectionType);
    if (normalize(block?.blockType) !== sectionType) return false;
    if (Number(block?.displayOrder) !== Number(section?.displayOrder)) return false;
    if (LEGACY_UNSUPPORTED_TYPES.has(sectionType)) containsUnsupportedLegacyType = true;
  }
  return containsUnsupportedLegacyType;
}

function repairMode(page, destinationSlug) {
  if (!destinationPage(page, destinationSlug)) return null;
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  const blocks = Array.isArray(page?.blocks) ? page.blocks : [];
  if (!sections.length) return null;
  if (blocks.length === 0) return "create";
  if (exactLegacyCopy(page)) return "normalize";
  return null;
}

function eligiblePage(page, destinationSlug) {
  return repairMode(page, destinationSlug) !== null;
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

function currentBlocksStillMatchLegacy(candidate, blocks = []) {
  if (candidate.repairMode !== "normalize") return blocks.length === 0;
  if (blocks.length !== candidate.legacyBlocks.length) return false;
  return blocks.every((block, index) => {
    const legacy = candidate.legacyBlocks[index];
    return normalize(block?.blockType) === normalize(legacy?.blockType)
      && Number(block?.displayOrder) === Number(legacy?.displayOrder);
  });
}

class ContentFactoryV2Repair {
  constructor(prisma) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    this.prisma = prisma;
  }

  async plan({ tenantId, siteSlug, destinationSlug } = {}) {
    const scopedTenantId = String(tenantId || "").trim();
    if (!scopedTenantId) {
      const error = new Error("tenantId est obligatoire.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_TENANT_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const normalizedSiteSlug = normalize(siteSlug);
    if (!normalizedSiteSlug) {
      const error = new Error("siteSlug est obligatoire.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_SITE_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const site = await this.prisma.agencySite.findUnique({
      where: {
        tenantId_slug: {
          tenantId: scopedTenantId,
          slug: normalizedSiteSlug,
        },
      },
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
      const error = new Error("Mini-site introuvable dans ce tenant.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_SITE_NOT_FOUND";
      error.statusCode = 404;
      throw error;
    }

    const candidates = (site.pages || [])
      .map((page) => ({ page, mode: repairMode(page, destinationSlug) }))
      .filter(({ mode }) => mode)
      .map(({ page, mode }) => ({
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        pageType: page.pageType,
        status: page.status,
        published: page.published === true,
        repairMode: mode,
        sectionCount: page.sections.length,
        blockCount: page.blocks.length,
        legacyBlocks: page.blocks.map((block) => ({
          blockType: block.blockType,
          displayOrder: block.displayOrder,
        })),
        blocksToCreate: page.sections.map((section) => repairBlockData(section, page)),
      }));

    return {
      ok: true,
      mode: "preview",
      tenantId: scopedTenantId,
      site: { id: site.id, slug: site.slug, name: site.name },
      destinationSlug: normalize(destinationSlug) || null,
      pagesScanned: site.pages.length,
      candidateCount: candidates.length,
      createCandidateCount: candidates.filter((item) => item.repairMode === "create").length,
      normalizeCandidateCount: candidates.filter((item) => item.repairMode === "normalize").length,
      blockCount: candidates.reduce((sum, page) => sum + page.blocksToCreate.length, 0),
      candidates,
    };
  }

  async apply({ tenantId, siteSlug, destinationSlug, confirm } = {}) {
    if (confirm !== true) {
      const error = new Error("confirm=true est obligatoire pour appliquer la réparation V2.");
      error.code = "CONTENT_FACTORY_V2_REPAIR_CONFIRM_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const preview = await this.plan({ tenantId, siteSlug, destinationSlug });
    if (!preview.candidateCount) {
      return { ...preview, mode: "apply", repairedPages: 0, normalizedPages: 0, createdBlocks: 0 };
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let repairedPages = 0;
      let normalizedPages = 0;
      let createdBlocks = 0;

      for (const candidate of preview.candidates) {
        const currentBlocks = await tx.pageBlock.findMany({
          where: { pageId: candidate.pageId },
          orderBy: { displayOrder: "asc" },
          select: { id: true, blockType: true, displayOrder: true },
        });

        if (!currentBlocksStillMatchLegacy(candidate, currentBlocks)) continue;

        if (candidate.repairMode === "normalize") {
          await tx.pageBlock.deleteMany({ where: { pageId: candidate.pageId } });
        }

        if (candidate.blocksToCreate.length > 0) {
          const created = await tx.pageBlock.createMany({
            data: candidate.blocksToCreate.map((block) => ({
              pageId: candidate.pageId,
              ...block,
            })),
          });
          repairedPages += 1;
          if (candidate.repairMode === "normalize") normalizedPages += 1;
          createdBlocks += created.count;
        }
      }

      return { repairedPages, normalizedPages, createdBlocks };
    });

    return {
      ...preview,
      mode: "apply",
      repairedPages: result.repairedPages,
      normalizedPages: result.normalizedPages,
      createdBlocks: result.createdBlocks,
    };
  }
}

module.exports = {
  ContentFactoryV2Repair,
  LEGACY_UNSUPPORTED_TYPES,
  currentBlocksStillMatchLegacy,
  destinationPage,
  eligiblePage,
  exactLegacyCopy,
  repairBlockData,
  repairMode,
};
