"use strict";

const { stableId } = require("./campaign-planner");

function compactStage(stage = {}) {
  return Object.freeze({
    stagePercent: Number(stage.stagePercent || 0),
    campaignId: stage.campaignId || null,
    agencyCount: Number(stage.agencyCount || 0),
    reportId: stage.reportId || null,
    reportCreatedAt: stage.reportCreatedAt || null,
    provenance: stage.provenance || "native",
    regenerationOfCampaignId: stage.regenerationOfCampaignId || null,
    recoveryOfCampaignId: stage.recoveryOfCampaignId || null,
    regenerationReason: stage.regenerationReason || null
  });
}

function buildRolloutDecisionSnapshot(rolloutGate, recoveryTrust) {
  const generatedAt = new Date().toISOString();
  const stages = Object.freeze((rolloutGate?.stages || []).map(compactStage));
  const payload = Object.freeze({
    decision: rolloutGate?.decision || "no_go",
    ready: rolloutGate?.ready === true,
    nextStagePercent: rolloutGate?.nextStagePercent ?? null,
    maxAgencies: rolloutGate?.maxAgencies ?? null,
    blockers: Object.freeze([...(rolloutGate?.blockers || [])]),
    stages,
    recoveryTrust: Object.freeze({
      decision: recoveryTrust?.decision || null,
      ready: recoveryTrust?.ready === true,
      total: Number(recoveryTrust?.summary?.total || 0),
      healthy: Number(recoveryTrust?.summary?.healthy || 0),
      blocked: Number(recoveryTrust?.summary?.blocked || 0),
      critical: Number(recoveryTrust?.summary?.critical || 0)
    })
  });
  return Object.freeze({
    snapshotId: `rollout-decision-${stableId(payload)}`,
    generatedAt,
    ...payload
  });
}

async function persistRolloutDecisionSnapshot(prisma, snapshot) {
  await prisma.$executeRaw`
    INSERT INTO "PresenceOperationAudit" ("providerKey", "scope", "eventType", "status", "payload", "result")
    VALUES ('network', 'network_rollout', 'rollout_decision_snapshot', ${snapshot.decision}, CAST(${JSON.stringify({ snapshotId: snapshot.snapshotId })} AS JSONB), CAST(${JSON.stringify(snapshot)} AS JSONB))
  `;
  return snapshot;
}

module.exports = { compactStage, buildRolloutDecisionSnapshot, persistRolloutDecisionSnapshot };
