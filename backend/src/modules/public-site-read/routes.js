"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  SectionAwarePublicSiteReadService,
} = require("./section-aware-service");
const { hydratePublicDynamicBlocks } = require("./dynamic-block-hydrator");
const { hydratePreviewPage } = require("./preview-hydrator");

function replacePageReference(reference, pages) {
  if (!reference) return null;
  return pages.find((page) => page.id === reference.id) || reference;
}

async function hydrateContract({ database, contract }) {
  const pages = await hydratePublicDynamicBlocks({
    prisma: database,
    tenantId: contract?.site?.tenantId || null,
    agencyId: contract?.site?.agencyId || contract?.agency?.id || null,
    pages: contract?.pages || [],
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
      version: "1.2",
      contentSource: "website-designer-sections",
      dynamicHydration: "single-pipeline",
      writeOperations: false,
    });
  });

  router.post(
    "/sites/:siteSlug/preview-hydrate",
    async (request, response, next) => {
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
    }
  );

  router.get(
    "/sites/:siteSlug",
    async (request, response, next) => {
      try {
        const baseContract = await service.bySlug(request.params.siteSlug);
        const contract = await hydrateContract({
          database,
          contract: baseContract,
        });

        response.set(
          "Cache-Control",
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        );
        response.json(contract);
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = {
  createPublicSiteReadRouter,
  hydrateContract,
  replacePageReference,
};
