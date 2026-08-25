"use strict";

const { getCampaign, transitionCampaign } = require("./campaign-store");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");
const { assertPilotExecutionReady } = require("./pilot-execution-gate");
const { buildGoogleRemediationPatch, patchGoogleLocation } = require("./google-remediation");
const { loadGoogleListing } = require("./remediation-execution-routes");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { createOperationId, appendOperationAudit } = require("./operation-audit");
const { getCampaignExecution, upsertCampaignExecution, isTerminalExecutionStatus } = require("./campaign-execution-ledger");

function frozenExecutableItems(campaign) {
  const plan = campaign?.plan || {};
  const items = Array.isArray(plan.executable) ? plan.executable : [];
  return items.map((item, index) => ({ ...item, campaignIndex: index }));
}

function approvedExecutionLimit(campaign, requested) {
  const approved = Math.max(1, Number(campaign?.approvedScope?.maxItems || campaign?.plan?.policy?.maxItems || 25));
  const requestedLimit = Math.max(1, Math.min(Number(requested || approved), 100));
  return Math.min(approved, requestedLimit);
}

function shouldPilotFailFast(campaign, result) {
  if (campaign?.pilot !== true) return false;
  return ["failed", "blocked_sensitive", "skipped"].includes(result?.status);
}

async function executeFrozenCampaign(prisma, campaignId, options = {}) {
  const campaign = await getCampaign(prisma, campaignId);
  if (!campaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  if (campaign.status !== "running") { const error = new Error("La campagne doit être en statut running"); error.status = 409; throw error; }
  await assertPilotExecutionReady(prisma, campaign);
  const maxItems = approvedExecutionLimit(campaign, options.maxItems);
  const items = frozenExecutableItems(campaign).slice(0, maxItems);
  const results = [];
  let halted = false;
  let haltReason = null;

  for (const item of items) {
    if (halted) break;
    const prior = await getCampaignExecution(prisma, campaignId, item.campaignIndex);
    if (prior && isTerminalExecutionStatus(prior.status)) { results.push({ item, status: "already_processed", prior }); continue; }
    if (item.providerKey !== "google_business_profile" || item.remediationKind !== "managed_api") {
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: item.agencyId, status: "skipped" });
      const outcome = { item, status: "skipped", reason: "provider_not_supported_for_campaign_execution" };
      results.push(outcome);
      if (shouldPilotFailFast(campaign, outcome)) { halted = true; haltReason = outcome.reason; }
      continue;
    }
    if (!item.agencyId || !Array.isArray(item.drift) || !item.drift.length) {
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: item.agencyId, status: "skipped" });
      const outcome = { item, status: "skipped", reason: "invalid_frozen_item" };
      results.push(outcome);
      if (shouldPilotFailFast(campaign, outcome)) { halted = true; haltReason = outcome.reason; }
      continue;
    }
    const agency = await prisma.agency.findUnique({ where: { id: item.agencyId } });
    if (!agency) {
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: item.agencyId, status: "failed", error: { message: "Agence introuvable" } });
      const outcome = { item, status: "failed", error: "Agence introuvable" };
      results.push(outcome);
      if (shouldPilotFailFast(campaign, outcome)) { halted = true; haltReason = outcome.error; }
      continue;
    }
    const preview = buildGoogleRemediationPatch(agency, item.drift);
    if (preview.risk.requiresSensitiveConfirmation && options.confirmSensitive !== true) {
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: item.agencyId, status: "blocked_sensitive" });
      const outcome = { item, status: "blocked_sensitive", risk: preview.risk };
      results.push(outcome);
      if (shouldPilotFailFast(campaign, outcome)) { halted = true; haltReason = "sensitive_item_blocked"; }
      continue;
    }
    const operationId = prior?.operationId || createOperationId(`campaign_${campaignId}`);
    let listing = null;
    try {
      await assertGoogleManagedWriteReady(prisma);
      await assertPilotExecutionReady(prisma, campaign);
      listing = await loadGoogleListing(prisma, agency.id);
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: agency.id, listingId: listing.id, operationId, status: "planned" });
      await appendOperationAudit(prisma, { operationId, providerKey: item.providerKey, agencyId: agency.id, listingId: listing.id, scope: "campaign", eventType: "campaign_intent", status: "planned", riskLevel: preview.risk.level, payload: { campaignId, campaignIndex: item.campaignIndex, frozenItem: item, patch: preview } });
      const validation = await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: true });
      await appendOperationAudit(prisma, { operationId, providerKey: item.providerKey, agencyId: agency.id, listingId: listing.id, scope: "campaign", eventType: "provider_validation", status: "validated", riskLevel: preview.risk.level, result: validation });
      await assertGoogleManagedWriteReady(prisma);
      await assertPilotExecutionReady(prisma, campaign);
      const result = await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: false });
      const tracked = await prisma.directoryListing.update({ where: { id: listing.id }, data: { status: "pending", notes: `Campagne ${campaignId}: correction Google soumise pour ${item.drift.join(", ")}.` } });
      await setRuntimeListingState(prisma, tracked.id, { automationStatus: "submitted", submittedAt: new Date(), submissionPayload: { campaignId, operationId, provider: item.providerKey, drift: item.drift, risk: preview.risk } });
      await appendOperationAudit(prisma, { operationId, providerKey: item.providerKey, agencyId: agency.id, listingId: listing.id, scope: "campaign", eventType: "external_write", status: "submitted", riskLevel: preview.risk.level, result });
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: agency.id, listingId: tracked.id, operationId, status: "submitted" });
      results.push({ item, status: "submitted", operationId, listingId: tracked.id });
    } catch (error) {
      await upsertCampaignExecution(prisma, { campaignId, campaignIndex: item.campaignIndex, providerKey: item.providerKey, agencyId: agency.id, listingId: listing?.id || null, operationId, status: "failed", error: { message: error.message, status: error.status || null, google: error.google || null } }).catch(() => {});
      await appendOperationAudit(prisma, { operationId, providerKey: item.providerKey, agencyId: agency.id, listingId: listing?.id || null, scope: "campaign", eventType: "failure", status: "failed", payload: { campaignId, campaignIndex: item.campaignIndex, frozenItem: item }, error: { message: error.message, status: error.status || null, google: error.google || null } }).catch(() => {});
      const outcome = { item, status: "failed", operationId, error: error.message };
      results.push(outcome);
      if (shouldPilotFailFast(campaign, outcome)) { halted = true; haltReason = error.message; }
    }
  }

  const summary = { planned: items.length, attempted: results.length, submitted: results.filter((r) => r.status === "submitted").length, alreadyProcessed: results.filter((r) => r.status === "already_processed").length, skipped: results.filter((r) => r.status === "skipped").length, blockedSensitive: results.filter((r) => r.status === "blocked_sensitive").length, failed: results.filter((r) => r.status === "failed").length, halted, haltReason };
  const terminalProblem = summary.failed > 0 || summary.blockedSensitive > 0 || (campaign.pilot === true && summary.skipped > 0);
  if (campaign.pilot === true && terminalProblem) {
    await transitionCampaign(prisma, campaignId, "failed", { reason: "pilot_fail_fast", payload: summary });
  } else if ((summary.submitted > 0 || summary.alreadyProcessed === items.length) && summary.failed === 0 && summary.blockedSensitive === 0) {
    await transitionCampaign(prisma, campaignId, "verifying", { reason: "campaign_execution_submitted", payload: summary });
  }
  return { campaignId, summary, results };
}

module.exports = { executeFrozenCampaign, frozenExecutableItems, approvedExecutionLimit, shouldPilotFailFast };
