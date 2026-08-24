"use strict";

const { getCampaign, transitionCampaign } = require("./campaign-store");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");
const { buildGoogleRemediationPatch, patchGoogleLocation } = require("./google-remediation");
const { loadGoogleListing } = require("./remediation-execution-routes");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { createOperationId, appendOperationAudit } = require("./operation-audit");

function frozenExecutableItems(campaign) {
  const plan = campaign?.plan || {};
  const items = Array.isArray(plan.executable) ? plan.executable : [];
  return items.map((item, index) => ({ ...item, campaignIndex: index }));
}

async function executeFrozenCampaign(prisma, campaignId, options = {}) {
  const campaign = await getCampaign(prisma, campaignId);
  if (!campaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  if (campaign.status !== "running") { const error = new Error("La campagne doit être en statut running"); error.status = 409; throw error; }
  const maxItems = Math.max(1, Math.min(Number(options.maxItems || 25), 100));
  const items = frozenExecutableItems(campaign).slice(0, maxItems);
  const results = [];

  for (const item of items) {
    if (item.providerKey !== "google_business_profile" || item.remediationKind !== "managed_api") {
      results.push({ item, status: "skipped", reason: "provider_not_supported_for_campaign_execution" });
      continue;
    }
    if (!item.agencyId || !Array.isArray(item.drift) || !item.drift.length) {
      results.push({ item, status: "skipped", reason: "invalid_frozen_item" });
      continue;
    }
    const agency = await prisma.agency.findUnique({ where: { id: item.agencyId } });
    if (!agency) {
      results.push({ item, status: "failed", error: "Agence introuvable" });
      continue;
    }
    const preview = buildGoogleRemediationPatch(agency, item.drift);
    if (preview.risk.requiresSensitiveConfirmation && options.confirmSensitive !== true) {
      results.push({ item, status: "blocked_sensitive", risk: preview.risk });
      continue;
    }
    const operationId = createOperationId(`campaign_${campaignId}`);
    let listing = null;
    try {
      await assertGoogleManagedWriteReady(prisma);
      listing = await loadGoogleListing(prisma, agency.id);
      await appendOperationAudit(prisma, {
        operationId,
        providerKey: item.providerKey,
        agencyId: agency.id,
        listingId: listing.id,
        scope: "campaign",
        eventType: "campaign_intent",
        status: "planned",
        riskLevel: preview.risk.level,
        payload: { campaignId, campaignIndex: item.campaignIndex, frozenItem: item, patch: preview }
      });
      const validation = await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: true });
      await appendOperationAudit(prisma, {
        operationId,
        providerKey: item.providerKey,
        agencyId: agency.id,
        listingId: listing.id,
        scope: "campaign",
        eventType: "provider_validation",
        status: "validated",
        riskLevel: preview.risk.level,
        result: validation
      });
      const result = await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: false });
      const tracked = await prisma.directoryListing.update({ where: { id: listing.id }, data: { status: "pending", notes: `Campagne ${campaignId}: correction Google soumise pour ${item.drift.join(", ")}.` } });
      await setRuntimeListingState(prisma, tracked.id, {
        automationStatus: "submitted",
        submittedAt: new Date(),
        submissionPayload: { campaignId, operationId, provider: item.providerKey, drift: item.drift, risk: preview.risk }
      });
      await appendOperationAudit(prisma, {
        operationId,
        providerKey: item.providerKey,
        agencyId: agency.id,
        listingId: listing.id,
        scope: "campaign",
        eventType: "external_write",
        status: "submitted",
        riskLevel: preview.risk.level,
        result
      });
      results.push({ item, status: "submitted", operationId, listingId: tracked.id });
    } catch (error) {
      if (agency) {
        await appendOperationAudit(prisma, {
          operationId,
          providerKey: item.providerKey,
          agencyId: agency.id,
          listingId: listing?.id || null,
          scope: "campaign",
          eventType: "failure",
          status: "failed",
          payload: { campaignId, campaignIndex: item.campaignIndex, frozenItem: item },
          error: { message: error.message, status: error.status || null, google: error.google || null }
        }).catch(() => {});
      }
      results.push({ item, status: "failed", operationId, error: error.message });
    }
  }

  const summary = {
    planned: items.length,
    submitted: results.filter((r) => r.status === "submitted").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    blockedSensitive: results.filter((r) => r.status === "blocked_sensitive").length,
    failed: results.filter((r) => r.status === "failed").length
  };
  if (summary.submitted > 0 && summary.failed === 0 && summary.blockedSensitive === 0) {
    await transitionCampaign(prisma, campaignId, "verifying", { reason: "campaign_execution_submitted", payload: summary });
  }
  return { campaignId, summary, results };
}

module.exports = { executeFrozenCampaign, frozenExecutableItems };
