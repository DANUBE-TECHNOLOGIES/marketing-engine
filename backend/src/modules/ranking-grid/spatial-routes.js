"use strict";

const express = require("express");
const { Prisma } = require("@prisma/client");
const { RankingGridRepository } = require("./repository");
const { methodologyMetadata } = require("./dataforseo-provider");
const { methodologyKey } = require("./service");
const { buildSpatialReport } = require("./spatial-analysis");
const { analyzeGeoPriorities } = require("./geo-priority");
const { enrichPriorityCells } = require("./territory-resolver");
const { buildTerritorialActionPlan, actionsFor } = require("./territorial-action-plan");
const {
  LEVER_PREFIX,
  parseTrackingMetadata,
  publicTrackedAction,
  createTrackedAction,
  updateTrackedAction,
} = require("./territorial-action-tracker");

function tenantSlugFrom(req) {
  return String(req.headers["x-tenant-slug"] || "mondescale").trim().toLowerCase();
}

function requestedPriorityLevels(value) {
  const supported = new Set(["p1", "p2", "p3", "monitor"]);
  const raw = String(value || "p1,p2")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(raw)];
  if (!unique.length || unique.some((level) => !supported.has(level))) {
    const error = new Error("levels must contain only p1,p2,p3,monitor");
    error.code = "RANKING_GRID_TERRITORY_LEVELS_INVALID";
    error.status = 400;
    throw error;
  }
  return unique;
}

function positiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

module.exports = function createRankingGridSpatialRoutes({ prisma }) {
  const router = express.Router();
  const repository = new RankingGridRepository(prisma);

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

  async function latestCalibratedCampaignRows(scope) {
    const methodology = methodologyMetadata();
    const key = methodologyKey(methodology);
    const suffix = `%:method:${key}`;

    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT DISTINCT ON (c."agencyId", c."keywordId")
        c.id,
        c."agencyId",
        c."keywordId"
      FROM "RankingGridCampaign" c
      INNER JOIN "Agency" a ON a.id = c."agencyId"
      WHERE a."tenantId" = ${scope}
        AND c."key" LIKE ${suffix}
        AND c."status" = 'completed'
      ORDER BY
        c."agencyId" ASC,
        c."keywordId" ASC,
        c."createdAt" DESC,
        c.id DESC
    `);

    return { methodology, key, rows };
  }

  async function loadSelectedCampaigns(scope, rows, requestedCampaignId) {
    const selected = Number.isInteger(requestedCampaignId) && requestedCampaignId > 0
      ? rows.filter((row) => Number(row.id) === requestedCampaignId)
      : rows;

    if (Number.isInteger(requestedCampaignId) && requestedCampaignId > 0 && !selected.length) {
      const error = new Error("ranking_grid_calibrated_campaign_not_found");
      error.code = "RANKING_GRID_CALIBRATED_CAMPAIGN_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const campaigns = [];
    for (const row of selected) {
      const campaign = await repository.getCampaign({
        tenantId: scope,
        campaignId: Number(row.id),
      });
      if (campaign) campaigns.push(campaign);
    }
    return campaigns;
  }

  async function enrichedCampaignPriority(scope, rows, requestedCampaignId, levels) {
    const campaigns = await loadSelectedCampaigns(scope, rows, requestedCampaignId);
    const priority = analyzeGeoPriorities(campaigns[0]);
    const territories = await enrichPriorityCells(priority.cells, {
      levels,
      maxCalls: 25,
    });
    return { priority, territories };
  }

  async function assertAgencyInTenant(scope, agencyId) {
    const agency = await prisma.agency.findFirst({
      where: { id: Number(agencyId), tenantId: scope },
      select: { id: true },
    });
    if (!agency) {
      const error = new Error("agency not found");
      error.status = 404;
      throw error;
    }
  }

  router.get("/rankings/grid/spatial-audit", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);
      const campaigns = await loadSelectedCampaigns(scope, rows, null);

      res.json({
        methodology,
        methodologyKey: key,
        ...buildSpatialReport(campaigns),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/spatial-priorities", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const requestedCampaignId = Number(req.query?.campaignId);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);
      const campaigns = await loadSelectedCampaigns(scope, rows, requestedCampaignId);

      const priorities = campaigns.map(analyzeGeoPriorities)
        .sort((a, b) => b.summary.p1 - a.summary.p1 || b.summary.p2 - a.summary.p2 || a.city.localeCompare(b.city));

      res.json({
        mode: "read_only",
        providerCalls: 0,
        executionTriggered: false,
        methodology,
        methodologyKey: key,
        summary: {
          campaigns: priorities.length,
          p1: priorities.reduce((sum, row) => sum + row.summary.p1, 0),
          p2: priorities.reduce((sum, row) => sum + row.summary.p2, 0),
          p3: priorities.reduce((sum, row) => sum + row.summary.p3, 0),
          actionableCells: priorities.reduce((sum, row) => sum + row.summary.actionableCells, 0),
        },
        campaigns: priorities,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/spatial-priorities/territories", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const requestedCampaignId = Number(req.query?.campaignId);
      if (!Number.isInteger(requestedCampaignId) || requestedCampaignId <= 0) {
        return res.status(400).json({ error: "ranking_grid_campaign_id_required" });
      }

      const levels = requestedPriorityLevels(req.query?.levels);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);
      const { priority, territories } = await enrichedCampaignPriority(scope, rows, requestedCampaignId, levels);

      res.json({
        mode: "read_only",
        databaseWrites: 0,
        providerCalls: 0,
        executionTriggered: false,
        methodology,
        methodologyKey: key,
        campaignId: priority.campaignId,
        agencyId: priority.agencyId,
        city: priority.city,
        requestedLevels: levels,
        prioritySummary: priority.summary,
        ...territories,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/spatial-priorities/action-plan", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const requestedCampaignId = Number(req.query?.campaignId);
      if (!Number.isInteger(requestedCampaignId) || requestedCampaignId <= 0) {
        return res.status(400).json({ error: "ranking_grid_campaign_id_required" });
      }

      const levels = requestedPriorityLevels(req.query?.levels);
      const { methodology, key, rows } = await latestCalibratedCampaignRows(scope);
      const { priority, territories } = await enrichedCampaignPriority(scope, rows, requestedCampaignId, levels);
      const plan = buildTerritorialActionPlan({
        campaignId: priority.campaignId,
        agencyId: priority.agencyId,
        city: priority.city,
        byCity: territories.byCity,
        cells: territories.cells,
      });

      res.json({
        methodology,
        methodologyKey: key,
        requestedLevels: levels,
        territorialSource: territories.source,
        externalCalls: territories.externalCalls,
        resolved: territories.resolved,
        unresolved: territories.unresolved,
        ...plan,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/rankings/grid/territorial-actions", async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const agencyId = positiveInt(req.query?.agencyId);
      const keywordId = positiveInt(req.query?.keywordId);
      if (!agencyId || !keywordId) {
        return res.status(400).json({ error: "agencyId_and_keywordId_required" });
      }
      await assertAgencyInTenant(scope, agencyId);

      const { key, rows } = await latestCalibratedCampaignRows(scope);
      const currentRow = rows.find((row) => Number(row.agencyId) === agencyId && Number(row.keywordId) === keywordId);
      const currentCampaign = currentRow
        ? await repository.getCampaign({ tenantId: scope, campaignId: Number(currentRow.id) })
        : null;

      const stored = await prisma.networkAction.findMany({
        where: { agencyId, lever: { startsWith: `${LEVER_PREFIX}:` } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }, { id: "desc" }],
      });

      const actions = stored
        .filter((row) => Number(parseTrackingMetadata(row.comment)?.keywordId) === keywordId)
        .map((row) => publicTrackedAction(row, currentCampaign));

      res.json({
        mode: "tracking",
        providerCalls: 0,
        externalCalls: 0,
        methodologyKey: key,
        currentCampaignId: currentCampaign ? Number(currentCampaign.id) : null,
        summary: {
          actions: actions.length,
          todo: actions.filter((row) => row.status === "todo").length,
          inProgress: actions.filter((row) => row.status === "in_progress").length,
          done: actions.filter((row) => row.status === "done").length,
          measured: actions.filter((row) => row.impact).length,
        },
        actions,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/rankings/grid/territorial-actions", express.json(), async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const campaignId = positiveInt(req.body?.campaignId);
      const territory = req.body?.territory || {};
      const actionCode = String(req.body?.actionCode || "").trim();
      if (!campaignId || !territory.city || !actionCode) {
        return res.status(400).json({ error: "campaignId_territory_actionCode_required" });
      }

      const { key, rows } = await latestCalibratedCampaignRows(scope);
      const campaigns = await loadSelectedCampaigns(scope, rows, campaignId);
      const campaign = campaigns[0];
      await assertAgencyInTenant(scope, campaign.agencyId);

      const allowed = actionsFor(territory.city, territory).find((item) => item.code === actionCode);
      if (!allowed) {
        return res.status(400).json({ error: "territorial_action_code_invalid" });
      }

      const realCells = new Map((campaign.points || []).map((point) => [`${point.row}:${point.col}`, point]));
      const suppliedCells = Array.isArray(territory.gridCells) ? territory.gridCells : [];
      if (!suppliedCells.length || suppliedCells.some((cell) => !realCells.has(`${Number(cell.row)}:${Number(cell.col)}`))) {
        return res.status(400).json({ error: "territorial_baseline_cells_invalid" });
      }

      const safeTerritory = {
        ...territory,
        gridCells: suppliedCells.map((cell) => {
          const point = realCells.get(`${Number(cell.row)}:${Number(cell.col)}`);
          return {
            row: Number(point.row),
            col: Number(point.col),
            rank: Number(point.position ?? point.absolutePosition) || null,
          };
        }),
      };

      const result = await createTrackedAction({
        prisma,
        agencyId: campaign.agencyId,
        campaign,
        methodologyKey: key,
        territory: safeTerritory,
        action: allowed,
        owner: req.body?.owner,
        deadline: req.body?.deadline,
      });

      res.status(result.created ? 201 : 200).json({
        created: result.created,
        providerCalls: 0,
        externalCalls: 0,
        action: publicTrackedAction(result.action, null),
      });
    } catch (error) {
      next(error);
    }
  });

  router.patch("/rankings/grid/territorial-actions/:actionId", express.json(), async (req, res, next) => {
    try {
      const scope = await tenantId(req);
      const actionId = positiveInt(req.params.actionId);
      const agencyId = positiveInt(req.body?.agencyId);
      if (!actionId || !agencyId) {
        return res.status(400).json({ error: "actionId_and_agencyId_required" });
      }
      await assertAgencyInTenant(scope, agencyId);

      const row = await updateTrackedAction({
        prisma,
        actionId,
        agencyId,
        status: req.body?.status,
        owner: req.body?.owner,
        deadline: req.body?.deadline,
        userNote: req.body?.userNote,
      });

      res.json({
        updated: true,
        providerCalls: 0,
        externalCalls: 0,
        action: publicTrackedAction(row, null),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
