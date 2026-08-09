"use strict";

const express =
  require("express");

const {
  PrismaClient,
} = require("@prisma/client");

const {
  PublicSiteReadService,
} = require("./service");

const {
  hydratePublicDynamicBlocks,
  loadApprovedCampaignOffers,
  offerCard,
  normalizeLimit,
} = require("./dynamic-block-hydrator");

const {
  hydratePreviewPage,
} = require("./preview-hydrator");

function replacePageReference(reference, pages) {
  if (!reference) return null;

  return (
    pages.find(
      (page) => page.id === reference.id
    ) || reference
  );
}

async function hydrateContract({
  database,
  contract,
}) {
  const pages =
    await hydratePublicDynamicBlocks({
      prisma: database,
      tenantId:
        contract?.site?.tenantId ||
        null,
      agencyId:
        contract?.site?.agencyId ||
        contract?.agency?.id ||
        null,
      pages:
        contract?.pages || [],
    });

  return {
    ...contract,
    pages,
    homePage:
      replacePageReference(
        contract?.homePage,
        pages
      ),
    page:
      replacePageReference(
        contract?.page,
        pages
      ),
  };
}

async function approvedOfferCatalog({
  database,
  agencyId,
  limit = 24,
}) {
  const numericAgencyId = Number(agencyId);

  if (!Number.isInteger(numericAgencyId)) {
    const error = new Error("Identifiant d’agence invalide.");
    error.statusCode = 400;
    error.code = "PUBLIC_OFFER_AGENCY_INVALID";
    throw error;
  }

  const agency = await database.agency.findUnique({
    where: {
      id: numericAgencyId,
    },
    select: {
      id: true,
      tenantId: true,
    },
  });

  if (!agency) {
    const error = new Error("Agence introuvable.");
    error.statusCode = 404;
    error.code = "PUBLIC_OFFER_AGENCY_NOT_FOUND";
    throw error;
  }

  const assets = await loadApprovedCampaignOffers({
    prisma: database,
    tenantId: agency.tenantId,
    agencyId: agency.id,
    limit: normalizeLimit(limit, 24),
  });

  return assets
    .map(offerCard)
    .filter(Boolean);
}

function createPublicSiteReadRouter({
  prisma,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const service =
    new PublicSiteReadService({
      prisma:
        database,
    });

  const router =
    express.Router();

  router.get(
    "/health",
    (
      request,
      response
    ) => {
      response.json({
        ok:
          true,

        capability:
          "public-site-read",

        version:
          "1.0",

        writeOperations:
          false,
      });
    }
  );

  router.get(
    "/agencies/:agencyId/offers",
    async (
      request,
      response,
      next
    ) => {
      try {
        const items = await approvedOfferCatalog({
          database,
          agencyId: request.params.agencyId,
          limit: request.query.limit,
        });

        response.set(
          "Cache-Control",
          "public, max-age=30, s-maxage=120, stale-while-revalidate=300"
        );

        response.json({
          items,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/sites/:siteSlug/preview-hydrate",
    async (
      request,
      response,
      next
    ) => {
      try {
        const result =
          await hydratePreviewPage({
            prisma:
              database,
            siteSlug:
              request.params.siteSlug,
            page:
              request.body?.page ||
              request.body ||
              {},
          });

        response.set(
          "Cache-Control",
          "private, no-store"
        );

        response.json({
          page:
            result.page,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/sites/:siteSlug",
    async (
      request,
      response,
      next
    ) => {
      try {
        const baseContract =
          await service.bySlug(
            request.params
              .siteSlug
          );

        const contract =
          await hydrateContract({
            database,
            contract:
              baseContract,
          });

        response.set(
          "Cache-Control",
          "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        );

        response.json(
          contract
        );
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
  approvedOfferCatalog,
};
