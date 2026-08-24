"use strict";

const { getCampaign, transitionCampaign } = require("./campaign-store");
const { listCampaignExecutions, upsertCampaignExecution } = require("./campaign-execution-ledger");
const { verifyGoogleRemediation } = require("./google-remediation");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { appendOperationAudit } = require("./operation-audit");
const { appendOperationSnapshot, getOperationSubmittedAt, calculatePropagationMs } = require("./operation-snapshots");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");

async function verifyCampaign(prisma, campaignId, options = {}) {
  const campaign = await getCampaign(prisma, campaignId);
  if (!campaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  if (campaign.status !== "verifying") { const error = new Error("La campagne doit être en statut verifying"); error.status = 409; throw error; }
  await assertGoogleManagedWriteReady(prisma);
  const executions = await listCampaignExecutions(prisma, campaignId);
  const maxItems = Math.max(1, Math.min(Number(options.maxItems || 50), 100));
  const candidates = executions.filter((row) => row.status === "submitted").slice(0, maxItems);
  const results = [];

  for (const row of candidates) {
    const agency = row.agencyId ? await prisma.agency.findUnique({ where: { id: row.agencyId } }) : null;
    const listing = row.listingId ? await prisma.directoryListing.findUnique({ where: { id: row.listingId } }) : null;
    if (!agency || !listing) {
      await upsertCampaignExecution(prisma, { ...row, status: "failed", error: { message: "Agence ou listing introuvable pendant la vérification" } });
      results.push({ campaignIndex: row.campaignIndex, status: "failed", error: "Agence ou listing introuvable" });
      continue;
    }
    try {
      const verification = await verifyGoogleRemediation(prisma, agency);
      const synced = await syncGoogleDirectoryListing(prisma, agency, listing);
      await setRuntimeListingState(prisma, synced.id, { automationStatus: verification.verified ? "validated" : "verification_pending" });
      const submittedAt = row.operationId ? await getOperationSubmittedAt(prisma, row.operationId) : null;
      const propagationMs = verification.verified ? calculatePropagationMs(submittedAt, new Date()) : null;
      await appendOperationSnapshot(prisma, {
        operationId: row.operationId,
        providerKey: row.providerKey,
        agencyId: agency.id,
        listingId: synced.id,
        phase: verification.verified ? "after_verified" : "after_pending",
        canonicalNap: buildCanonicalAgencyIdentity(agency),
        remoteNap: verification.remote,
        diff: verification.diff,
        propagationMs
      });
      await appendOperationAudit(prisma, {
        operationId: row.operationId,
        providerKey: row.providerKey,
        agencyId: agency.id,
        listingId: synced.id,
        scope: "campaign",
        eventType: "campaign_verification",
        status: verification.verified ? "verified" : "verification_pending",
        result: { campaignId, campaignIndex: row.campaignIndex, verified: verification.verified, drift: verification.diff?.drift || [], propagationMs }
      });
      await upsertCampaignExecution(prisma, { ...row, listingId: synced.id, status: verification.verified ? "verified" : "submitted", error: null });
      results.push({ campaignIndex: row.campaignIndex, agencyId: agency.id, listingId: synced.id, status: verification.verified ? "verified" : "pending", propagationMs, drift: verification.diff?.drift || [] });
    } catch (error) {
      results.push({ campaignIndex: row.campaignIndex, agencyId: agency.id, listingId: listing.id, status: "error", error: error.message });
    }
  }

  const after = await listCampaignExecutions(prisma, campaignId);
  const relevant = after.filter((row) => row.status !== "skipped");
  const allVerified = relevant.length > 0 && relevant.every((row) => row.status === "verified");
  const anyFailed = relevant.some((row) => row.status === "failed");
  if (allVerified) {
    await transitionCampaign(prisma, campaignId, "completed", { reason: "campaign_all_executions_verified", payload: { verified: relevant.length } });
  } else if (anyFailed && options.failOnExecutionFailure === true) {
    await transitionCampaign(prisma, campaignId, "failed", { reason: "campaign_verification_failure", payload: { failed: relevant.filter((row) => row.status === "failed").length } });
  }

  return {
    campaignId,
    checked: candidates.length,
    verified: results.filter((item) => item.status === "verified").length,
    pending: results.filter((item) => item.status === "pending").length,
    failed: results.filter((item) => ["failed", "error"].includes(item.status)).length,
    completed: allVerified,
    results
  };
}

module.exports = { verifyCampaign };
