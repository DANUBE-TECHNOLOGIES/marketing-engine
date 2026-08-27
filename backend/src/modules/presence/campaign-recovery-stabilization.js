"use strict";

const { appendOperationAudit } = require("./operation-audit");

const MANUAL_CLASSIFICATIONS = new Set(["not_applied", "partial_or_changed"]);
const RESOLUTION_STATUSES = new Set(["resolved_verified", "accepted_manual_followup", "escalated_blocking"]);

async function listRecoveryEvidence(prisma, sourceCampaignId) {
  return prisma.$queryRaw`
    SELECT "id", "eventType", "status", "operationId", "agencyId", "payload", "result", "createdAt"
    FROM "PresenceOperationAudit"
    WHERE "scope" = 'campaign_recovery'
      AND "payload"->>'sourceCampaignId' = ${sourceCampaignId}
      AND "eventType" IN ('recovery_qualification', 'recovery_manual_resolution', 'recovery_resolution_verification')
    ORDER BY "createdAt" ASC, "id" ASC
  `;
}

function evaluateRecoveryStabilization(evidence = []) {
  const latestQualifications = new Map();
  const latestResolutions = new Map();
  const latestVerifications = new Map();
  for (const row of evidence) {
    const index = Number(row?.payload?.campaignIndex ?? row?.result?.campaignIndex);
    if (!Number.isInteger(index)) continue;
    if (row.eventType === "recovery_qualification") latestQualifications.set(index, row);
    if (row.eventType === "recovery_manual_resolution") latestResolutions.set(index, row);
    if (row.eventType === "recovery_resolution_verification") latestVerifications.set(index, row);
  }
  const required = [];
  for (const [campaignIndex, qualification] of latestQualifications) {
    const classification = qualification?.result?.classification || qualification?.status;
    if (MANUAL_CLASSIFICATIONS.has(classification)) required.push({ campaignIndex, classification, qualification });
  }
  const unresolved = [], resolved = [], blocking = [], verificationRequired = [];
  for (const item of required) {
    const resolution = latestResolutions.get(item.campaignIndex) || null;
    if (!resolution) { unresolved.push(item); continue; }
    const status = resolution?.result?.resolution || resolution?.status;
    if (status === "escalated_blocking") { blocking.push({ ...item, resolution }); continue; }
    if (!RESOLUTION_STATUSES.has(status)) { unresolved.push(item); continue; }
    if (status === "resolved_verified") {
      const verification = latestVerifications.get(item.campaignIndex) || null;
      const verified = verification?.result?.classification === "already_applied" && verification?.result?.verified === true;
      if (!verified) { verificationRequired.push({ ...item, resolution }); continue; }
      resolved.push({ ...item, resolution, verification });
      continue;
    }
    resolved.push({ ...item, resolution });
  }
  const ready = unresolved.length === 0 && blocking.length === 0 && verificationRequired.length === 0;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    requiredCount: required.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    blockingCount: blocking.length,
    verificationRequiredCount: verificationRequired.length,
    blockers: Object.freeze([
      ...(unresolved.length ? ["recovery_manual_resolution_required"] : []),
      ...(verificationRequired.length ? ["recovery_manual_resolution_verification_required"] : []),
      ...(blocking.length ? ["recovery_manual_resolution_blocking"] : [])
    ]),
    unresolved: Object.freeze(unresolved.map((x) => ({ campaignIndex: x.campaignIndex, classification: x.classification }))),
    verificationRequired: Object.freeze(verificationRequired.map((x) => ({ campaignIndex: x.campaignIndex, classification: x.classification }))),
    blocking: Object.freeze(blocking.map((x) => ({ campaignIndex: x.campaignIndex, classification: x.classification, resolution: x.resolution?.result?.resolution || x.resolution?.status })))
  });
}

async function getRecoveryStabilization(prisma, sourceCampaignId) {
  return evaluateRecoveryStabilization(await listRecoveryEvidence(prisma, sourceCampaignId));
}

async function recordRecoveryManualResolution(prisma, { sourceCampaignId, campaignIndex, agencyId = null, operationId = null, resolution, note = null }) {
  if (!RESOLUTION_STATUSES.has(resolution)) { const error = new Error("Résolution recovery invalide"); error.status = 400; throw error; }
  await appendOperationAudit(prisma, {
    operationId: operationId || undefined, providerKey: "google_business_profile", agencyId,
    scope: "campaign_recovery", eventType: "recovery_manual_resolution", status: resolution,
    payload: { sourceCampaignId, campaignIndex },
    result: { sourceCampaignId, campaignIndex, resolution, note: note || null, externalWrite: false, resolvedAt: new Date().toISOString() }
  });
  return getRecoveryStabilization(prisma, sourceCampaignId);
}

async function recordRecoveryResolutionVerification(prisma, { sourceCampaignId, campaignIndex, agencyId = null, operationId = null, qualification }) {
  const verified = qualification?.classification === "already_applied";
  await appendOperationAudit(prisma, {
    operationId: operationId || undefined, providerKey: "google_business_profile", agencyId,
    scope: "campaign_recovery", eventType: "recovery_resolution_verification", status: verified ? "verified" : "not_verified",
    payload: { sourceCampaignId, campaignIndex },
    result: { sourceCampaignId, campaignIndex, classification: qualification?.classification || "unknown", requested: qualification?.requested || [], remaining: qualification?.remaining || [], verified, externalWrite: false, verifiedAt: new Date().toISOString() }
  });
  return getRecoveryStabilization(prisma, sourceCampaignId);
}

module.exports = { MANUAL_CLASSIFICATIONS, RESOLUTION_STATUSES, listRecoveryEvidence, evaluateRecoveryStabilization, getRecoveryStabilization, recordRecoveryManualResolution, recordRecoveryResolutionVerification };
