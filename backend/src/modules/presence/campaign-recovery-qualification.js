"use strict";

const { readGoogleLocation } = require("./google-business-information");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { compareNap } = require("./nap-diff");
const { assertGoogleApiReady } = require("./operational-readiness");
const { appendOperationAudit } = require("./operation-audit");

function normalizeField(field) {
  if (field === "phone") return "phone";
  if (field === "website") return "website";
  if (field === "name") return "name";
  if (field === "address") return "address";
  return null;
}

function requestedDriftState(diff, drift = []) {
  const requested = [...new Set(drift.map(normalizeField).filter(Boolean))];
  const remaining = requested.filter((field) => diff?.drift?.includes?.(field));
  const matched = requested.filter((field) => !remaining.includes(field));
  let classification = "unknown";
  if (requested.length && remaining.length === 0) classification = "already_applied";
  else if (requested.length && matched.length === 0) classification = "not_applied";
  else if (requested.length) classification = "partial_or_changed";
  return Object.freeze({ requested: Object.freeze(requested), remaining: Object.freeze(remaining), matched: Object.freeze(matched), classification });
}

async function qualifyRecoveryItem(prisma, sourceCampaign, execution) {
  await assertGoogleApiReady(prisma);
  const index = Number(execution?.campaignIndex);
  if (!Number.isInteger(index) || index < 0) { const error = new Error("campaignIndex invalide"); error.status = 400; throw error; }
  const frozen = sourceCampaign?.plan?.executable?.[index];
  if (!frozen) { const error = new Error("Item figé introuvable dans la campagne source"); error.status = 404; throw error; }
  const agencyId = Number(frozen.agencyId || execution.agencyId);
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) { const error = new Error("Agence introuvable"); error.status = 404; throw error; }
  if (!agency.googleLocationId) { const error = new Error("Agence sans googleLocationId"); error.status = 409; throw error; }
  const remote = await readGoogleLocation(prisma, agency.googleLocationId);
  const canonical = buildCanonicalAgencyIdentity(agency);
  const diff = compareNap(canonical, remote.nap);
  const state = requestedDriftState(diff, frozen.drift || []);
  const result = Object.freeze({
    sourceCampaignId: sourceCampaign.campaignId,
    campaignIndex: index,
    agencyId,
    providerKey: frozen.providerKey,
    operationId: execution.operationId || null,
    executionStatus: execution.status || null,
    classification: state.classification,
    requested: state.requested,
    remaining: state.remaining,
    matched: state.matched,
    retryAutomaticallyAllowed: false,
    externalWrite: false,
    observedAt: new Date().toISOString()
  });
  await appendOperationAudit(prisma, {
    operationId: execution.operationId || undefined,
    providerKey: "google_business_profile",
    agencyId,
    listingId: execution.listingId || null,
    scope: "campaign_recovery",
    eventType: "recovery_qualification",
    status: state.classification,
    payload: { sourceCampaignId: sourceCampaign.campaignId, campaignIndex: index, requested: state.requested },
    result
  });
  return result;
}

module.exports = { normalizeField, requestedDriftState, qualifyRecoveryItem };
