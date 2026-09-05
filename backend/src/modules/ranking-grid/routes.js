"use strict";

const express = require("express");
const { RankingGridRepository } = require("./repository");
const { RankingGridService } = require("./service");
const { buildHeatmap } = require("./heatmap");
const { compareCampaigns } = require("./comparison");
const { auditAgencyIdentity, summarizeIdentityAudit } = require("./identity-audit");
const { auditAgencyRollout, summarizeRolloutReadiness } = require("./rollout-readiness");
const { UnconfiguredRankingGridProvider } = require("./provider");
const { DataForSeoMapsRankingGridProvider } = require("./dataforseo-provider");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

function gridProviderEnabled() {
  return String(process.env.RANKING_GRID_DATAFORSEO_ENABLED || "false").toLowerCase() === "true";
}

function profileIdentity(profile) {
  const data = profile?.googleLocationData && typeof profile.googleLocationData === "object"
    ? profile.googleLocationData
    : {};
  return {
    placeId: data.placeId || data.place_id || null,
    cid: data.cid || null,
  };
}

function placeIdFromGoogleReviewUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    for (const key of ["placeid", "place_id", "query_place_id"]) {
      const candidate = url.searchParams.get(key);
      if (candidate) return candidate.trim() || null;
    }
  } catch {
    // Keep a conservative string fallback for stored legacy URLs.
  }

  const queryMatch = raw.match(/[?&](?:placeid|place_id|query_place_id)=([^&#]+)/i);
  if (queryMatch?.[1]) {
    try {
      return decodeURIComponent(queryMatch[1]).trim() || null;
    } catch {
      return queryMatch[1].trim() || null;
    }
  }

  const placeIdMatch = raw.match(/(?:place_id:|placeid:)(ChI[A-Za-z0-9_-]+)/i);
  return placeIdMatch?.[1] || null;
}

function createDataForSeoProvider(prisma) {
  return new DataForSeoMapsRankingGridProvider({
    targetResolver: async (agencyId) => {
      const agency = await prisma.agency.findUnique({
        where: { id: Number(agencyId) },
        select: {
          name: true,
          address: true,
          postalCode: true,
          website: true,
          googleReviewUrl: true,
          profile: { select: { googleLocationData: true } },
        },
      });
      if (!agency) return null;
      const profile = profileIdentity(agency.profile);
      return {
        name: agency.name,
        address: agency.address,
        postalCode: agency.postalCode,
        website: agency.website,
        placeId: profile.placeId || placeIdFromGoogleReviewUrl(agency.googleReviewUrl),
        cid: profile.cid,
      };
    },
  });
}

async function loadRolloutAgencies(prisma, tenantId) {
  const agencies = await prisma.agency.findMany({
    where: { tenantId },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      city: true,
      googleReviewUrl: true,
      googleLocationId: true,
      profile: { select: { googleLocationData: true } },
    },
  });

  if (!agencies.length) return agencies;

  const agencyIds = agencies.map((agency) => agency.id);
  const [keywords, campaigns] = await Promise.all([
    prisma.rankingKeyword.findMany({
      where: {
        agencyId: { in: agencyIds },
        active: true,
      },
      orderBy: [{ id: "asc" }],
      select: { id: true, agencyId: true, keyword: true, city: true, active: true },
    }),
    prisma.rankingGridCampaign.findMany({
      where: { agencyId: { in: agencyIds } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, agencyId: true, centerLat: true, centerLng: true },
    }),
  ]);

  const keywordsByAgency = new Map();
  for (const keyword of keywords) {
    if (!keywordsByAgency.has(keyword.agencyId)) keywordsByAgency.set(keyword.agencyId, []);
    keywordsByAgency.get(keyword.agencyId).push(keyword);
  }

  const latestCampaignByAgency = new Map();
  for (const campaign of campaigns) {
    if (!latestCampaignByAgency.has(campaign.agencyId)) {
      latestCampaignByAgency.set(campaign.agencyId, campaign);
    }
  }

  return agencies.map((agency) => ({
    ...agency,
    keywords: keywordsByAgency.get(agency.id) || [],
    rankingGridCampaigns: latestCampaignByAgency.has(agency.id)
      ? [latestCampaignByAgency.get(agency.id)]
      : [],
  }));
}

module.exports = function createRankingGridRoutes({ prisma, provider }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);
  const rankingProvider = provider || (
    gridProviderEnabled()
      ? createDataForSeoProvider(prisma)
      : new UnconfiguredRankingGridProvider()
  );
  const service = new RankingGridService({ repository, provider: rankingProvider });

  async function tenantId(req) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlugFrom(req) },
      select: { id: true },
    });
    if (!tenant) {
      const error = new Error("Tenant not found");
      error.status = 404;
      throw error;
    }
    return tenant.id;
  }

  router.get("/rankings/grid/campaigns", async (req, res, next) => {
    try {
      const limit = Math.min(20, Math.max(1, Number(req.query?.limit) || 6));
      const campaigns = await repository.listCampaigns({
        tenantId: await tenantId(req),
        limit,
      });
      res.json({ campaigns });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/history", async (req, res, next) => {
    try {
      const history = await repository.listCampaignHistory({
        tenantId: await tenantId(req),
        agencyId: req.query?.agencyId,
        keywordId: req.query?.keywordId,
        limit: req.query?.limit,
      });
      res.json({ history });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/identity-audit", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const agencies = await prisma.agency.findMany({
        where: { tenantId: scope },
        orderBy: [{ city: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          city: true,
          googleReviewUrl: true,
          googleLocationId: true,
          profile: { select: { googleLocationData: true } },
        },
      });
      const audited = agencies.map((agency) => auditAgencyIdentity(agency, {
        profileIdentity,
        placeIdFromGoogleReviewUrl,
      }));
      res.json({
        summary: summarizeIdentityAudit(audited),
        agencies: audited,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/rollout-readiness", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const agencies = await loadRolloutAgencies(prisma, scope);

      const audited = agencies.map((agency) => {
        const identity = auditAgencyIdentity(agency, {
          profileIdentity,
          placeIdFromGoogleReviewUrl,
        });
        return auditAgencyRollout(agency, identity);
      });

      res.json({
        summary: summarizeRolloutReadiness(audited),
        agencies: audited,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/compare", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const fromCampaign = await repository.getCampaign({
        tenantId: scope,
        campaignId: Number(req.query?.fromCampaignId),
      });
      const toCampaign = await repository.getCampaign({
        tenantId: scope,
        campaignId: Number(req.query?.toCampaignId),
      });
      if (!fromCampaign || !toCampaign) {
        return res.status(404).json({ error: "ranking_grid_campaign_not_found" });
      }
      res.json(compareCampaigns(fromCampaign, toCampaign));
    } catch (error) {
      if (error.code === "RANKING_GRID_COMPARISON_SCOPE_MISMATCH" || error.code === "RANKING_GRID_COMPARISON_GEOMETRY_MISMATCH") {
        error.status = 400;
      }
      next(error);
    }
  });

  router.post("/rankings/grid/campaigns", async (req, res, next) => {
    try {
      const campaign = await service.createCampaign({
        tenantId: await tenantId(req),
        agencyId: Number(req.body?.agencyId),
        keywordId: Number(req.body?.keywordId),
        centerLat: Number(req.body?.centerLat),
        centerLng: Number(req.body?.centerLng),
        gridSize: req.body?.gridSize == null ? 5 : Number(req.body.gridSize),
        spacingKm: req.body?.spacingKm == null ? 1 : Number(req.body.spacingKm),
      });
      res.status(201).json(campaign);
    } catch (error) {
      if (error.code === "RANKING_GRID_SCOPE_NOT_FOUND") error.status = 404;
      next(error);
    }
  });

  router.post("/rankings/grid/campaigns/:campaignId/snapshots", async (req, res, next) => {
    try {
      const campaign = await service.createSnapshot({
        tenantId: await tenantId(req),
        sourceCampaignId: Number(req.params.campaignId),
        snapshotDate: req.body?.snapshotDate,
      });
      res.status(201).json(campaign);
    } catch (error) {
      if (error.code === "RANKING_GRID_CAMPAIGN_NOT_FOUND") error.status = 404;
      if (error.code === "RANKING_GRID_SNAPSHOT_DATE_INVALID") error.status = 400;
      next(error);
    }
  });

  router.get("/rankings/grid/campaigns/:campaignId/heatmap", async (req, res, next) => {
    try {
      const campaign = await repository.getCampaign({
        tenantId: await tenantId(req),
        campaignId: Number(req.params.campaignId),
      });
      if (!campaign) return res.status(404).json({ error: "ranking_grid_campaign_not_found" });
      res.json(buildHeatmap(campaign));
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/campaigns/:campaignId", async (req, res, next) => {
    try {
      const campaign = await repository.getCampaign({
        tenantId: await tenantId(req),
        campaignId: Number(req.params.campaignId),
      });
      if (!campaign) return res.status(404).json({ error: "ranking_grid_campaign_not_found" });
      res.json(campaign);
    } catch (error) {
      next(error);
    }
  });

  router.post("/rankings/grid/campaigns/:campaignId/run", async (req, res, next) => {
    try {
      if (rankingProvider.name === "unconfigured") {
        return res.status(503).json({
          error: "ranking_grid_provider_unconfigured",
          hint: "Set RANKING_GRID_DATAFORSEO_ENABLED=true only when paid grid measurements are intended",
        });
      }
      const campaign = await service.runCampaign({
        tenantId: await tenantId(req),
        campaignId: Number(req.params.campaignId),
      });
      res.json(campaign);
    } catch (error) {
      if (error.code === "RANKING_GRID_CAMPAIGN_NOT_FOUND") error.status = 404;
      next(error);
    }
  });

  return router;
};

module.exports.gridProviderEnabled = gridProviderEnabled;
module.exports.profileIdentity = profileIdentity;
module.exports.placeIdFromGoogleReviewUrl = placeIdFromGoogleReviewUrl;
module.exports.createDataForSeoProvider = createDataForSeoProvider;
module.exports.loadRolloutAgencies = loadRolloutAgencies;
