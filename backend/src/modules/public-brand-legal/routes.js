"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const {
  PublicBrandLegalResolver,
} = require("./resolver");

const {
  findSiteBySlug,
  findSiteByAgencyId,
  publicSiteContract,
} = require("./site-lookup");

function asyncRoute(handler) {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function applyPublicCache(response) {
  response.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
}

async function resolvePublicBrandLegalTenantId(database, request) {
  const direct = String(
    request?.tenant?.id ||
    request?.tenantId ||
    request?.get?.("x-tenant-id") ||
    ""
  ).trim();

  if (direct) return direct;

  const slug = String(
    request?.tenant?.slug ||
    request?.tenantSlug ||
    request?.get?.("x-tenant-slug") ||
    ""
  ).trim();

  if (!slug) {
    const error = new Error("Le tenant est obligatoire pour le runtime public Brand + Legal.");
    error.code = "PUBLIC_BRAND_LEGAL_TENANT_REQUIRED";
    error.statusCode = 400;
    throw error;
  }

  const tenant = await database.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!tenant) {
    const error = new Error("Tenant public introuvable.");
    error.code = "PUBLIC_BRAND_LEGAL_TENANT_NOT_FOUND";
    error.statusCode = 404;
    error.details = { slug };
    throw error;
  }

  return String(tenant.id);
}

function createPublicBrandLegalRouter({ prisma } = {}) {
  const database = prisma || new PrismaClient();
  const resolver = new PublicBrandLegalResolver({ prisma: database });
  const router = express.Router();

  router.get("/health", (request, response) => {
    response.json({
      ok: true,
      capability: "public-brand-legal-runtime",
      version: "1.1",
      tenantScoped: true,
      lookupModes: ["site-slug", "agency-id"],
      writeOperations: false,
    });
  });

  router.get(
    "/sites/:siteSlug",
    asyncRoute(async (request, response) => {
      const tenantId = await resolvePublicBrandLegalTenantId(database, request);
      const site = await findSiteBySlug({
        prisma: database,
        siteSlug: request.params.siteSlug,
        tenantId,
      });

      const runtime = await resolver.resolve({
        agencyId: site.agencyId,
        tenantId,
      });

      applyPublicCache(response);

      response.json({
        version: "1.1",
        site: publicSiteContract(site),
        runtime,
      });
    })
  );

  router.get(
    "/agencies/:agencyId",
    asyncRoute(async (request, response) => {
      const tenantId = await resolvePublicBrandLegalTenantId(database, request);
      const site = await findSiteByAgencyId({
        prisma: database,
        agencyId: request.params.agencyId,
        tenantId,
      });

      const runtime = await resolver.resolve({
        agencyId: site.agencyId,
        tenantId,
      });

      applyPublicCache(response);

      response.json({
        version: "1.1",
        site: publicSiteContract(site),
        runtime,
      });
    })
  );

  return router;
}

module.exports = {
  createPublicBrandLegalRouter,
  asyncRoute,
  applyPublicCache,
  resolvePublicBrandLegalTenantId,
};
