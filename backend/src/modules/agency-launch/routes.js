"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  resolveLaunchState,
  summarizeLaunchStates,
} = require("./service");
const {
  PrepublicationReadinessService,
  score,
  blockers,
} = require("./prepublication-readiness");
const {
  legalRuntimeReadiness,
  applyLegalRuntimeToReadiness,
} = require("./legal-runtime-readiness");
const {
  localCitationsReadiness,
  applyLocalCitationsToReadiness,
} = require("./local-citations-readiness");
const {
  localRankingsReadiness,
  applyLocalRankingsToReadiness,
} = require("./local-rankings-readiness");
const {
  applyRankingContentCoverage,
} = require("./ranking-content-coverage");
const {
  applySeoActionQueue,
} = require("./seo-action-queue");

function createHttpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function statusCode(error) {
  return Number(error?.statusCode || error?.status || 500);
}

function sendError(response, error) {
  response.status(statusCode(error)).json({
    error: error?.code || "AGENCY_LAUNCH_ERROR",
    message: error?.message || "Impossible de calculer l'état de lancement.",
  });
}

async function tenantIdForRequest(database, request) {
  const direct = String(
    request.tenantId || request?.tenant?.id || request.get("x-tenant-id") || ""
  ).trim();
  if (direct) return direct;

  const slug = String(
    request.tenantSlug || request?.tenant?.slug || request.get("x-tenant-slug") || ""
  ).trim();
  if (!slug) {
    throw createHttpError(400, "AGENCY_LAUNCH_TENANT_REQUIRED", "Le tenant est obligatoire.");
  }

  const tenant = await database.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) {
    throw createHttpError(404, "AGENCY_LAUNCH_TENANT_NOT_FOUND", "Tenant introuvable.");
  }
  return tenant.id;
}

async function assertAgencyInTenant(database, tenantId, agencyId) {
  const id = Number(agencyId);
  if (!Number.isInteger(id) || id <= 0) {
    throw createHttpError(400, "AGENCY_LAUNCH_INVALID_AGENCY_ID", "Identifiant agence invalide.");
  }

  const agency = await database.agency.findFirst({
    where: { id, tenantId },
    select: { id: true },
  });
  if (!agency) {
    throw createHttpError(404, "AGENCY_LAUNCH_AGENCY_NOT_FOUND", "Agence introuvable dans ce tenant.");
  }
  return agency.id;
}

async function readinessWithPublicRuntime(database, tenantId, agencyId, service) {
  const report = await service.readiness(agencyId);
  const [legalRuntime, localCitations, localRankings] = await Promise.all([
    legalRuntimeReadiness(database, tenantId, agencyId),
    localCitationsReadiness(database, tenantId, agencyId),
    localRankingsReadiness(database, tenantId, agencyId),
  ]);

  const withLegal = applyLegalRuntimeToReadiness(report, legalRuntime, { score, blockers });
  const withCitations = applyLocalCitationsToReadiness(withLegal, localCitations);
  const withRankings = applyLocalRankingsToReadiness(withCitations, localRankings);

  const pages = await database.agencySitePage.findMany({
    where: {
      site: {
        agencyId: Number(agencyId),
        tenantId,
      },
    },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      slug: true,
      title: true,
      h1: true,
      status: true,
      published: true,
      seoTitle: true,
      metaDescription: true,
      blocks: {
        orderBy: { displayOrder: "asc" },
        select: {
          status: true,
          content: true,
        },
      },
      sections: {
        orderBy: { displayOrder: "asc" },
        select: {
          status: true,
          jsonContent: true,
        },
      },
    },
  });

  return applySeoActionQueue(
    applyRankingContentCoverage(withRankings, pages)
  );
}

async function networkForTenant(database, tenantId) {
  const service = new PrepublicationReadinessService({ prisma: database, tenantId });
  const agencies = await database.agency.findMany({
    where: { tenantId },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: { id: true },
  });

  const items = [];
  for (const agency of agencies) {
    try {
      const report = await readinessWithPublicRuntime(database, tenantId, agency.id, service);
      const launchState = resolveLaunchState({ site: report.site, readiness: report.readiness });
      items.push({ ...report, launchState });
    } catch (error) {
      items.push({
        agency: { id: agency.id },
        readiness: { ready: false },
        launchState: {
          code: "to_complete",
          label: "À compléter",
          priority: 2,
          actionable: true,
          action: "complete",
        },
        error: {
          code: error?.code || "AGENCY_LAUNCH_READINESS_ERROR",
          message: error?.message || "État de lancement indisponible.",
        },
      });
    }
  }

  return {
    version: "2.5",
    mode: "prepublication",
    tenantId,
    generatedAt: new Date().toISOString(),
    summary: summarizeLaunchStates(items),
    items,
  };
}

function createAgencyLaunchRouter({ prisma } = {}) {
  const database = prisma || new PrismaClient();
  const router = express.Router();

  router.get("/health", (request, response) => {
    response.json({
      ok: true,
      capability: "agency-launch",
      version: "2.5",
      mode: "prepublication",
      legalRuntimeRequired: true,
      localCitationsObserved: true,
      localRankingsObserved: true,
      rankingContentCoverageObserved: true,
      seoActionQueueObserved: true,
    });
  });

  router.get("/network", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(database, request);
      response.json(await networkForTenant(database, tenantId));
    } catch (error) {
      sendError(response, error);
    }
  });

  router.get("/agencies/:agencyId/readiness", async (request, response) => {
    try {
      const tenantId = await tenantIdForRequest(database, request);
      const agencyId = await assertAgencyInTenant(database, tenantId, request.params.agencyId);
      const service = new PrepublicationReadinessService({ prisma: database, tenantId });
      const report = await readinessWithPublicRuntime(database, tenantId, agencyId, service);

      response.json({
        ...report,
        launchState: resolveLaunchState({ site: report.site, readiness: report.readiness }),
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  return router;
}

module.exports = {
  createAgencyLaunchRouter,
  tenantIdForRequest,
  assertAgencyInTenant,
  readinessWithPublicRuntime,
  networkForTenant,
};
