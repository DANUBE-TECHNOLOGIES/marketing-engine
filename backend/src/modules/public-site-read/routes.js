"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  SectionAwarePublicSiteReadService,
} = require("./section-aware-service");
const { hydratePublicDynamicBlocks } = require("./dynamic-block-hydrator");
const { hydratePreviewPage } = require("./preview-hydrator");
const {
  contentTargetsAgency,
} = require("../ai-content/editorial-targeting");

function replacePageReference(reference, pages) {
  if (!reference) return null;
  return pages.find((page) => page.id === reference.id) || reference;
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function inspirationIds(pages = []) {
  const ids = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "inspirations") continue;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      for (const key of ["items", "inspirations", "articles"]) {
        for (const item of Array.isArray(content[key]) ? content[key] : []) {
          if (item?.id !== undefined && item?.id !== null) ids.add(String(item.id));
        }
      }
    }
  }

  return [...ids];
}

async function filterAgencyInspirations({ database, tenantId, agencyId, pages }) {
  const ids = inspirationIds(pages);
  if (!ids.length || !tenantId || !agencyId || !database?.seoContent) return pages;

  const contents = await database.seoContent.findMany({
    where: {
      tenantId: String(tenantId),
      id: { in: ids },
      status: "published",
      publishedAt: { not: null },
    },
    select: { id: true, seo: true },
  });
  const allowed = new Set(
    contents
      .filter((content) => contentTargetsAgency(content, agencyId))
      .map((content) => String(content.id))
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "inspirations") return block;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      const next = { ...content };

      for (const key of ["items", "inspirations", "articles"]) {
        if (!Array.isArray(content[key])) continue;
        next[key] = content[key].filter((item) => allowed.has(String(item?.id)));
      }

      return { ...block, content: next };
    }),
  }));
}

async function hydrateContract({ database, contract }) {
  const tenantId = contract?.site?.tenantId || null;
  const agencyId = contract?.site?.agencyId || contract?.agency?.id || null;
  const hydratedPages = await hydratePublicDynamicBlocks({
    prisma: database,
    tenantId,
    agencyId,
    pages: contract?.pages || [],
  });
  const pages = await filterAgencyInspirations({
    database,
    tenantId,
    agencyId,
    pages: hydratedPages,
  });

  return {
    ...contract,
    pages,
    homePage: replacePageReference(contract?.homePage, pages),
    page: replacePageReference(contract?.page, pages),
  };
}

function createPublicSiteReadRouter({ prisma } = {}) {
  const database = prisma || new PrismaClient();
  const service = new SectionAwarePublicSiteReadService({ prisma: database });
  const router = express.Router();

  router.get("/health", (request, response) => {
    response.json({
      ok: true,
      capability: "public-site-read",
      version: "1.5",
      contentSource: "website-designer-v2-blocks",
      fallbackContentSource: "agency-site-sections",
      dynamicHydration: "single-pipeline",
      editorialTargeting: "tenant-and-agency-aware",
      writeOperations: false,
    });
  });

  router.post("/sites/:siteSlug/preview-hydrate", async (request, response, next) => {
    try {
      const result = await hydratePreviewPage({
        prisma: database,
        siteSlug: request.params.siteSlug,
        page: request.body?.page || request.body || {},
      });
      response.set("Cache-Control", "private, no-store");
      response.json({ page: result.page });
    } catch (error) {
      next(error);
    }
  });

  router.get("/sites/:siteSlug", async (request, response, next) => {
    try {
      const baseContract = await service.bySlug(request.params.siteSlug);
      const contract = await hydrateContract({ database, contract: baseContract });
      response.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      response.json(contract);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createPublicSiteReadRouter,
  hydrateContract,
  replacePageReference,
  filterAgencyInspirations,
  inspirationIds,
};
