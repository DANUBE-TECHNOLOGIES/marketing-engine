"use strict";

const express = require("express");
const { getCampaign, createCampaign } = require("./campaign-store");
const { getFrozenCampaignReport } = require("./campaign-report-store");
const { evaluateCampaignEvidenceCompatibility } = require("./campaign-evidence-compatibility");
const { buildPilotContext } = require("./pilot-routes");
const { preflightRecoveryTrustFingerprint } = require("./preflight-recovery-trust-binding");
const { stableId } = require("./campaign-planner");
const { findActiveRegeneration, listRegenerationChildren } = require("./campaign-regeneration-lineage");

function regenerationMode(source) {
  const scope = source?.approvedScope || {};
  const rolloutStage = [50, 100].includes(Number(scope.rolloutStage)) ? Number(scope.rolloutStage) : null;
  const agencyIds = Array.isArray(scope.agencyIds) ? scope.agencyIds.map(Number).filter(Number.isInteger) : [];
  return Object.freeze({ rolloutStage, extended: !rolloutStage && agencyIds.length > 1, agencyIds });
}

function regenerationReason(compatibility) {
  return compatibility?.legacy ? "legacy_evidence_incompatible" : "evidence_inconsistent";
}

function campaignRegenerationRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/campaigns/:campaignId/regeneration-preview", async (req, res) => {
    try {
      const source = await getCampaign(prisma, req.params.campaignId);
      if (!source) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      const [frozen, activeRegeneration, regenerationChildren] = await Promise.all([
        getFrozenCampaignReport(prisma, source.campaignId), findActiveRegeneration(prisma, source.campaignId), listRegenerationChildren(prisma, source.campaignId)
      ]);
      const compatibility = evaluateCampaignEvidenceCompatibility(source, frozen?.report || null);
      const mode = regenerationMode(source);
      const context = await buildPilotContext(prisma, mode);
      const concurrencyReady = !activeRegeneration;
      const ready = compatibility.regenerationRequired === true && context.readiness?.ready === true && concurrencyReady;
      const blockers = activeRegeneration ? ["active_regeneration_already_exists"] : [];
      return res.status(ready ? 200 : 409).json({ ok: ready, externalWrite: false, persisted: false, sourceCampaignId: source.campaignId, compatibility, mode, readiness: context.readiness, preflightId: context.frozenPreflight?.preflightId || null, concurrency: { ready: concurrencyReady, blockers, activeRegeneration: activeRegeneration ? { campaignId: activeRegeneration.campaignId, status: activeRegeneration.status, createdAt: activeRegeneration.createdAt } : null }, regenerationChildren });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/campaigns/:campaignId/regenerate", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, externalWrite: false, error: "confirm=true requis pour créer une campagne régénérée" });
      const source = await getCampaign(prisma, req.params.campaignId);
      if (!source) return res.status(404).json({ ok: false, externalWrite: false, error: "Campagne Presence introuvable" });
      const frozen = await getFrozenCampaignReport(prisma, source.campaignId);
      const compatibility = evaluateCampaignEvidenceCompatibility(source, frozen?.report || null);
      if (!compatibility.regenerationRequired) return res.status(409).json({ ok: false, externalWrite: false, error: "La preuve source est déjà compatible", compatibility });

      const mode = regenerationMode(source);
      const context = await buildPilotContext(prisma, mode);
      if (!context.readiness?.ready) return res.status(409).json({ ok: false, externalWrite: false, error: "Regeneration gate NO-GO", compatibility, readiness: context.readiness });
      const preflight = context.frozenPreflight;
      const trustFingerprint = preflightRecoveryTrustFingerprint(preflight);
      if (!preflight?.preflightId || !trustFingerprint) return res.status(409).json({ ok: false, externalWrite: false, error: "Nouveau préflight conforme requis" });

      const srcScope = source.approvedScope || {};
      const approvedScope = {
        agencyIds: context.plan.policy?.agencyIds || [], providerKeys: context.plan.policy?.providerKeys || [], maxItems: context.plan.policy?.maxItems || 0, allowSensitive: false,
        rolloutStage: mode.rolloutStage, sourceEvidenceCampaignId: srcScope.sourceEvidenceCampaignId || null, sourceEvidenceReportId: srcScope.sourceEvidenceReportId || null, sourceEvidenceReportCreatedAt: srcScope.sourceEvidenceReportCreatedAt || null,
        preflightRecoveryTrustFingerprint: trustFingerprint, regenerationOfCampaignId: source.campaignId, regenerationReason: regenerationReason(compatibility), regenerationSourceDecision: compatibility.decision
      };
      const approvedPlanFingerprint = stableId({ approvedScope, selected: context.plan.selected || [] });
      const name = req.body?.name || `Régénération ${source.name || source.campaignId}`;

      const campaign = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`presence-regeneration:${source.campaignId}`}))`;
        const existing = await findActiveRegeneration(tx, source.campaignId);
        if (existing) { const error = new Error(`Une régénération active existe déjà: ${existing.campaignId}`); error.status = 409; error.code = "ACTIVE_REGENERATION_EXISTS"; error.activeRegeneration = existing; throw error; }
        return createCampaign(tx, context.plan, name, { pilot: true, preflightId: preflight.preflightId, approvedScope, approvedPlanFingerprint });
      });

      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, regeneration: true, regenerationOfCampaignId: source.campaignId, regenerationReason: approvedScope.regenerationReason, sourceCompatibility: compatibility, campaign, approvedScope, approvedPlanFingerprint });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, externalWrite: false, error: error.message, code: error.code, activeRegeneration: error.activeRegeneration ? { campaignId: error.activeRegeneration.campaignId, status: error.activeRegeneration.status, createdAt: error.activeRegeneration.createdAt } : null }); }
  });

  return router;
}

module.exports = { campaignRegenerationRoutes, regenerationMode, regenerationReason };
