"use strict";

const express = require("express");
const path = require("node:path");

const {
  normalizeSitePublicationError,
  sitePublicationError,
} = require("./errors");
const {
  SitePublicationHistoryStore,
} = require("./history-store");
const {
  SitePublicationLockManager,
} = require("./lock-manager");
const {
  PagePublicationClient,
} = require("./page-publication-client");
const {
  SiteReadinessClient,
} = require("./readiness-client");
const {
  SitePublicationRepository,
} = require("./repository");
const {
  SitePublicationService,
} = require("./service");

function requestHeaders(request) {
  const result = {};

  for (const name of [
    "authorization",
    "cookie",
    "x-tenant-id",
    "x-tenant-slug",
    "x-request-id",
    "x-user-id",
    "x-user-name",
  ]) {
    const value = request.get(name);
    if (value) result[name] = value;
  }

  return result;
}

function sendError(response, error) {
  const normalized = normalizeSitePublicationError(error);

  response.status(normalized.statusCode).json({
    error: normalized.code,
    message: normalized.message,
    details: normalized.details || {},
  });
}

async function tenantIdForRequest(prisma, request) {
  const direct = String(
    request.tenantId || request.get("x-tenant-id") || ""
  ).trim();

  if (direct) return direct;

  const slug = String(
    request.tenantSlug || request.get("x-tenant-slug") || ""
  ).trim();

  if (!slug) {
    throw sitePublicationError(
      "SITE_PUBLICATION_TENANT_REQUIRED",
      "Le tenant est obligatoire pour publier un mini-site.",
      400
    );
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!tenant) {
    throw sitePublicationError(
      "SITE_PUBLICATION_TENANT_NOT_FOUND",
      "Tenant introuvable.",
      404,
      { slug }
    );
  }

  return tenant.id;
}

async function assertSiteInTenant(prisma, request, siteId) {
  const tenantId = await tenantIdForRequest(prisma, request);
  const site = await prisma.agencySite.findFirst({
    where: {
      id: String(siteId),
      tenantId,
    },
    select: {
      id: true,
      agencyId: true,
      tenantId: true,
      slug: true,
    },
  });

  if (!site) {
    throw sitePublicationError(
      "SITE_NOT_FOUND",
      "Le mini-site demandé est introuvable dans ce tenant.",
      404,
      { siteId }
    );
  }

  return site;
}

function createSitePublicationRoutes(prisma, options = {}) {
  const router = express.Router();

  const repository =
    options.repository || new SitePublicationRepository({ prisma });

  const backendOrigin =
    process.env.SITE_PUBLICATION_BACKEND_ORIGIN ||
    `http://127.0.0.1:${process.env.PORT || 4000}`;

  const readinessClient =
    options.readinessClient ||
    new SiteReadinessClient({
      backendOrigin,
    });

  const pagePublicationClient =
    options.pagePublicationClient ||
    new PagePublicationClient({
      backendOrigin,
    });

  const historyStore =
    options.historyStore ||
    new SitePublicationHistoryStore({
      storageDirectory:
        process.env.SITE_PUBLICATION_HISTORY_DIR ||
        path.resolve(process.cwd(), "storage/site-publication-history"),
    });

  const lockManager =
    options.lockManager || new SitePublicationLockManager();

  const service =
    options.service ||
    new SitePublicationService({
      repository,
      readinessClient,
      pagePublicationClient,
      historyStore,
      lockManager,
    });

  router.get("/sites/:siteId/status", async (request, response) => {
    try {
      await assertSiteInTenant(prisma, request, request.params.siteId);
      response.json(await service.status(request.params.siteId));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/sites/:siteId/plan", async (request, response) => {
    try {
      await assertSiteInTenant(prisma, request, request.params.siteId);
      response.json(
        await service.plan({
          siteId: request.params.siteId,
          headers: requestHeaders(request),
        })
      );
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/sites/:siteId/history", async (request, response) => {
    try {
      await assertSiteInTenant(prisma, request, request.params.siteId);
      response.json({
        siteId: request.params.siteId,
        items: await service.history(request.params.siteId, {
          limit: request.query.limit,
        }),
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/sites/:siteId/publish", async (request, response) => {
    try {
      await assertSiteInTenant(prisma, request, request.params.siteId);

      const result = await service.publish({
        siteId: request.params.siteId,
        headers: {
          ...requestHeaders(request),
          "x-site-publication-force-token":
            request.headers["x-site-publication-force-token"] || "",
        },
        force: request.body?.force === true,
        planToken: request.body?.planToken || null,
      });

      response.json(result);
    } catch (error) {
      sendError(response, error);
    }
  });

  router.post("/sites/:siteId/unpublish", async (request, response) => {
    try {
      await assertSiteInTenant(prisma, request, request.params.siteId);

      response.json(
        await service.unpublish({
          siteId: request.params.siteId,
          headers: requestHeaders(request),
        })
      );
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}

module.exports = {
  assertSiteInTenant,
  createSitePublicationRoutes,
  requestHeaders,
  sendError,
  tenantIdForRequest,
};
