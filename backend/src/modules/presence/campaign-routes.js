"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignPlan } = require("./campaign-planner");
const { createCampaign, getCampaign, listCampaigns, transitionCampaign, listCampaignEvents } = require("./campaign-store");
const { assertPilotCampaignTransition } = require("./pilot-campaign-approval");
const { evaluatePilotExecutionGate } = require("./pilot-execution-gate");

function campaignRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/campaigns/preview", async (req, res) => {
    try {
      const state = await loadCockpitState(prisma);
      const plan = buildCampaignPlan(state, {
        agencyIds: req.body?.agencyIds,
        providerKeys: req.body?.providerKeys,
        maxItems: req.body?.maxItems,
        allowSensitive: req.body?.allowSensitive === true
      });
      return res.json({ ok: true, persisted: false, executable: false, plan });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/campaigns", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer une campagne Presence" });
      const state = await loadCockpitState(prisma);
      const plan = buildCampaignPlan(state, {
        agencyIds: req.body?.agencyIds,
        providerKeys: req.body?.providerKeys,
        maxItems: req.body?.maxItems,
        allowSensitive: req.body?.allowSensitive === true
      });
      const campaign = await createCampaign(prisma, plan, req.body?.name || null);
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, campaign });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/campaigns", async (req, res) => {
    try { const campaigns = await listCampaigns(prisma, req.query.limit); return res.json({ ok: true, campaigns }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/campaigns/:campaignId", async (req, res) => {
    try {
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      const events = await listCampaignEvents(prisma, req.params.campaignId);
      return res.json({ ok: true, campaign, events });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/campaigns/:campaignId/execution-readiness", async (req, res) => {
    try {
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, externalWrite: false, error: "Campagne Presence introuvable" });
      const gate = await evaluatePilotExecutionGate(prisma, campaign);
      return res.json({
        ok: true,
        externalWrite: false,
        campaignId: campaign.id || req.params.campaignId,
        status: campaign.status || null,
        executableNow: campaign.status === "running" && gate.ready === true,
        gate,
        governanceDiagnostic: gate.governanceDiagnostic || null
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, externalWrite: false, error: error.message, readiness: error.readiness || undefined, governanceDiagnostic: error.readiness?.governanceDiagnostic || null });
    }
  });

  router.post("/api/presence/campaigns/:campaignId/transition", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour changer l’état d’une campagne" });
      const campaign = await transitionCampaign(prisma, req.params.campaignId, req.body?.status, {
        reason: req.body?.reason,
        payload: req.body?.payload,
        beforeTransition: async (current, toStatus) => assertPilotCampaignTransition(prisma, current, toStatus)
      });
      return res.json({ ok: true, externalWrite: false, campaign });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, code: error.code || null, blockers: error.blockers || [] });
    }
  });

  return router;
}

module.exports = { campaignRoutes };
