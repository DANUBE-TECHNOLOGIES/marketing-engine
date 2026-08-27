"use strict";

const { stableId } = require("./campaign-planner");
const { appendOperationAudit } = require("./operation-audit");
const { listRecoveryEvidence, getRecoveryStabilization } = require("./campaign-recovery-stabilization");

function evidenceSignature(evidence = []) {
  return stableId(evidence.map((row) => ({ id:String(row.id ?? ""), eventType:row.eventType||null, status:row.status||null, operationId:row.operationId||null, agencyId:row.agencyId||null, payload:row.payload||null, result:row.result||null, createdAt:row.createdAt?new Date(row.createdAt).toISOString():null })));
}

async function getLatestRecoveryStabilizationSnapshot(prisma, sourceCampaignId) {
  const rows = await prisma.$queryRaw`
    SELECT "id", "operationId", "status", "payload", "result", "createdAt"
    FROM "PresenceOperationAudit"
    WHERE "scope" = 'campaign_recovery'
      AND "eventType" = 'recovery_stabilization_snapshot'
      AND "payload"->>'sourceCampaignId' = ${sourceCampaignId}
    ORDER BY "createdAt" DESC, "id" DESC LIMIT 1
  `;
  return rows[0] || null;
}

async function freezeRecoveryStabilizationSnapshot(prisma, sourceCampaignId) {
  const [stabilization, evidence] = await Promise.all([getRecoveryStabilization(prisma, sourceCampaignId), listRecoveryEvidence(prisma, sourceCampaignId)]);
  if (!stabilization.ready) { const error = new Error("Recovery stabilization NO-GO"); error.status = 409; error.stabilization = stabilization; throw error; }
  const signature = evidenceSignature(evidence);
  const snapshotId = `recovery-stabilization-${signature}`;
  const result = { sourceCampaignId, snapshotId, evidenceSignature: signature, evidenceCount: evidence.length, stabilization, externalWrite:false, frozenAt:new Date().toISOString() };
  await appendOperationAudit(prisma, { operationId:snapshotId, providerKey:"google_business_profile", scope:"campaign_recovery", eventType:"recovery_stabilization_snapshot", status:"ready", payload:{sourceCampaignId}, result });
  return result;
}

async function evaluateRecoveryStabilizationSnapshotBinding(prisma, sourceCampaignId, expected = {}) {
  const [snapshot, evidence, stabilization] = await Promise.all([getLatestRecoveryStabilizationSnapshot(prisma, sourceCampaignId), listRecoveryEvidence(prisma, sourceCampaignId), getRecoveryStabilization(prisma, sourceCampaignId)]);
  const blockers=[];
  const currentSignature=evidenceSignature(evidence);
  const frozenSignature=snapshot?.result?.evidenceSignature||null;
  if(!snapshot) blockers.push("recovery_stabilization_snapshot_missing");
  if(snapshot&&frozenSignature!==currentSignature) blockers.push("recovery_stabilization_snapshot_stale");
  if(expected.snapshotId&&snapshot?.result?.snapshotId!==expected.snapshotId) blockers.push("recovery_stabilization_snapshot_changed");
  if(expected.evidenceSignature&&frozenSignature!==expected.evidenceSignature) blockers.push("recovery_stabilization_signature_changed");
  if(!stabilization.ready) blockers.push(...(stabilization.blockers||[]));
  return Object.freeze({ready:blockers.length===0,decision:blockers.length?"no_go":"go",snapshot:snapshot?.result||null,currentSignature,stabilization,blockers:Object.freeze([...new Set(blockers)])});
}

module.exports={evidenceSignature,getLatestRecoveryStabilizationSnapshot,freezeRecoveryStabilizationSnapshot,evaluateRecoveryStabilizationSnapshotBinding};
