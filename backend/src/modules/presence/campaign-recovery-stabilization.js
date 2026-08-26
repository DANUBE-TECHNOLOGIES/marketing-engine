"use strict";

const { appendOperationAudit } = require("./operation-audit");

const MANUAL_CLASSIFICATIONS = new Set(["not_applied", "partial_or_changed"]);
const RESOLUTION_STATUSES = new Set(["resolved_verified", "accepted_manual_followup", "escalated_blocking"]);

async function listRecoveryEvidence(prisma, sourceCampaignId) {
  const rows = await prisma.$queryRaw`
    SELECT "id", "eventType", "status", "operationId", "agencyId", "payload", "result", "createdAt"
    FROM "PresenceOperationAudit"
    WHERE "scope" = 'campaign_recovery'
      AND "payload"->>'sourceCampaignId' = ${sourceCampaignId}
      AND "eventType" IN ('recovery_qualification', 'recovery_manual_resolution')
    ORDER BY "createdAt" ASC, "id" ASC
  `;
  return rows;
}

function evaluateRecoveryStabilization(evidence = []) {
  const latestQualifications = new Map();
  const latestResolutions = new Map();
  for (const row of evidence) {
    const index = Number(row?.payload?.campaignIndex ?? row?.result?.campaignIndex);
    if (!Number.isInteger(index)) continue;
    if (row.eventType === "recovery_qualification") latestQualifications.set(index, row);
    if (row.eventType === "recovery_manual_resolution") latestResolutions.set(index, row);
  }
  const required = [];
  for (const [campaignIndex, qualification] of latestQualifications) {
    const classification = qualification?.result?.classification || qualification?.status;
    if (MANUAL_CLASSIFICATIONS.has(classification)) required.push({ campaignIndex, classification, qualification });
  }
  const unresolved = [];
  const resolved = [];
  const blocking = [];
  for (const item of required) {
    const resolution = latestResolutions.get(item.campaignIndex) || null;
    if (!resolution) { unresolved.push(item); continue; }
    const status = resolution?.result?.resolution || resolution?.status;
    if (status === "escalated_blocking") blocking.push({ ...item, resolution });
    else if (RESOLUTION_STATUSES.has(status)) resolved.push({ ...item, resolution });
    else unresolved.push(item);
  }
  const ready = unresolved.length === 0 && blocking.length === 0;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    requiredCount: required.length,
    resolvedCount: resolved.length,
    unresolvedCount: unresolved.length,
    blockingCount: blocking.length,
    blockers: Object.freeze([
      ...(unresolved.length ? ["recovery_manual_resolution_required"] : []),
      ...(blocking.length ? ["recovery_manual_resolution_blocking"] : [])
    ]),
    unresolved: Object.freeze(unresolved.map((x) => ({ campaignIndex: x.campaignIndex, classification: x.classification }))),
    blocking: Object.freeze(blocking.map((x) => ({ campaignIndex: x.campaignIndex, classification: x.classification, resolution: x.resolution?.result?.resolution || x.resolution?.status })))
  });
}

async function getRecoveryStabilization(prisma, sourceCampaignId) {
  return evaluateRecoveryStabilization(await listRecoveryEvidence(prisma, sourceCampaignId));
}

async function recordRecoveryManualResolution(prisma, { sourceCampaignId, campaignIndex, agencyId = null, operationId = null, resolution, note = null }) {
  if (!RESOLUTION_STATUSES.has(resolution)) { const error = new Error("Résolution recovery invalide"); error.status = 400; throw error; }
  await appendOperationAudit(prisma, {
    operationId: operationId || undefined,
    providerKey: "google_business_profile",
    agencyId,
    scope: "campaign_recovery",
    eventType: "recovery_manual_resolution",
    status: resolution,
    payload: { sourceCampaignId, campaignIndex },
    result: { sourceCampaignId, campaignIndex, resolution, note: note || null, externalWrite: false, resolvedAt: new Date().toISOString() }
  });
  return getRecoveryStabilization(prisma, sourceCampaignId);
}

module.exports = { MANUAL_CLASSIFICATIONS, RESOLUTION_STATUSES, listRecoveryEvidence, evaluateRecoveryStabilization, getRecoveryStabilization, recordRecoveryManualResolution };
