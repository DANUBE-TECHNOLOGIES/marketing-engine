"use strict";

const express = require("express");
const { listPendingPropagation } = require("./propagation-watch");
const { buildPropagationControlPlan } = require("./propagation-control");
const { buildPropagationDashboard } = require("./propagation-dashboard");
const { verifyGoogleRemediation } = require("./google-remediation");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { appendOperationAudit, createOperationId, findLatestSubmittedOperationId } = require("./operation-audit");
const { appendOperationSnapshot, getOperationSubmittedAt } = require("./operation-snapshots");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");

async function ensureEscalationAction(prisma, item) {
  const title = `Propagation Google bloquée — ${item.agencyName}`;
  const existing = await prisma.networkAction.findFirst({
    where: { agencyId: item.agencyId, lever: "presence_google_propagation", status: { in: ["todo", "in_progress"] } }
  });
  if (existing) return { created: false, action: existing };
  const action = await prisma.networkAction.create({
    data: {
      agencyId: item.agencyId,
      lever: "presence_google_propagation",
      title,
      description: `La correction Google reste non propagée après le seuil stale. Listing ${item.listingId}. Aucun PATCH n'a été réémis automatiquement.`,
      status: "todo"
    }
  });
  return { created: true, action };
}

async function resolveEscalationAction(prisma, agencyId) {
  const actions = await prisma.networkAction.findMany({
    where: { agencyId, lever: "presence_google_propagation", status: { in: ["todo", "in_progress"] } }
  });
  for (const action of actions) {
    await prisma.networkAction.update({
      where: { id: action.id },
      data: { status: "done", comment: "Propagation Google confirmée par Presence; escalade clôturée automatiquement." }
    });
  }
  return actions.length;
}

function propagationControlRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/propagation/dashboard", async (req, res) => {
    try {
      const [rows, actions] = await Promise.all([
        listPendingPropagation(prisma, {
          limit: req.query.limit,
          warnAfterMs: req.query.warnAfterMs,
          staleAfterMs: req.query.staleAfterMs
        }),
        prisma.networkAction.findMany({
          where: { lever: "presence_google_propagation", status: { in: ["todo", "in_progress"] } },
          orderBy: { createdAt: "asc" }
        })
      ]);
      return res.json({ ok: true, ...buildPropagationDashboard(rows, actions) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/propagation/control-preview", async (req, res) => {
    try {
      const rows = await listPendingPropagation(prisma, {
        limit: req.query.limit,
        warnAfterMs: req.query.warnAfterMs,
        staleAfterMs: req.query.staleAfterMs
      });
      return res.json({ ok: true, externalWrite: false, plan: buildPropagationControlPlan(rows, { maxVerifications: req.query.maxVerifications }) });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/propagation/control-run", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour lancer les vérifications et escalades" });
      await assertGoogleManagedWriteReady(prisma);
      const rows = await listPendingPropagation(prisma, {
        limit: req.body?.limit,
        warnAfterMs: req.body?.warnAfterMs,
        staleAfterMs: req.body?.staleAfterMs
      });
      const plan = buildPropagationControlPlan(rows, { maxVerifications: req.body?.maxVerifications });
      const agencyIds = [...new Set(plan.verificationQueue.map((item) => item.agencyId))];
      const agencies = agencyIds.length ? await prisma.agency.findMany({ where: { id: { in: agencyIds } } }) : [];
      const agencyById = new Map(agencies.map((agency) => [agency.id, agency]));
      const results = [];

      for (const item of plan.verificationQueue) {
        const agency = agencyById.get(item.agencyId);
        if (!agency) continue;
        const listing = await prisma.directoryListing.findUnique({ where: { id: item.listingId } });
        if (!listing) continue;
        const operationId = await findLatestSubmittedOperationId(prisma, listing.id) || createOperationId("google_propagation_check");
        try {
          const verification = await verifyGoogleRemediation(prisma, agency);
          const synced = await syncGoogleDirectoryListing(prisma, agency, listing);
          await setRuntimeListingState(prisma, synced.id, { automationStatus: verification.verified ? "validated" : "verification_pending" });
          const submittedAt = await getOperationSubmittedAt(prisma, operationId);
          const propagationMs = verification.verified && submittedAt ? Math.max(0, Date.now() - new Date(submittedAt).getTime()) : null;
          await appendOperationSnapshot(prisma, {
            operationId,
            providerKey: "google_business_profile",
            agencyId: agency.id,
            listingId: synced.id,
            phase: verification.verified ? "after_verified" : "after_pending",
            canonicalNap: buildCanonicalAgencyIdentity(agency),
            remoteNap: verification.remote,
            diff: verification.diff,
            propagationMs
          });
          await appendOperationAudit(prisma, {
            operationId,
            providerKey: "google_business_profile",
            agencyId: agency.id,
            listingId: synced.id,
            scope: "network",
            eventType: "propagation_recheck",
            status: verification.verified ? "verified" : "verification_pending",
            result: { verified: verification.verified, drift: verification.diff.drift, propagationMs }
          });
          const escalationsResolved = verification.verified ? await resolveEscalationAction(prisma, agency.id) : 0;
          results.push({ agencyId: agency.id, listingId: synced.id, operationId, verified: verification.verified, propagationMs, drift: verification.diff.drift, escalationsResolved });
        } catch (error) {
          results.push({ agencyId: agency.id, listingId: item.listingId, operationId, verified: false, error: error.message, googleStatus: error.status || null, escalationsResolved: 0 });
        }
      }

      const verifiedListingIds = new Set(results.filter((item) => item.verified).map((item) => item.listingId));
      const escalations = [];
      for (const item of plan.escalationQueue) {
        if (verifiedListingIds.has(item.listingId)) continue;
        const escalation = await ensureEscalationAction(prisma, item);
        escalations.push({ agencyId: item.agencyId, listingId: item.listingId, created: escalation.created, actionId: escalation.action.id });
      }

      return res.json({
        ok: results.every((item) => !item.error),
        externalWrite: false,
        providerPatchIssued: false,
        plan,
        summary: {
          checked: results.length,
          verified: results.filter((item) => item.verified).length,
          stillPending: results.filter((item) => !item.verified && !item.error).length,
          errors: results.filter((item) => item.error).length,
          escalationsCreated: escalations.filter((item) => item.created).length,
          escalationsResolved: results.reduce((sum, item) => sum + (item.escalationsResolved || 0), 0)
        },
        results,
        escalations
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness || undefined });
    }
  });

  return router;
}

module.exports = { propagationControlRoutes, ensureEscalationAction, resolveEscalationAction };
