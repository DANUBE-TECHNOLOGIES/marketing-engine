"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { stageTargetAgencyCount, campaignAgencyCount, recoveryEvidenceStillValid } = require("./network-rollout-gate");

test("progressive rollout targets ceil of network percentage", () => {
  assert.equal(stageTargetAgencyCount(9, 25), 3);
  assert.equal(stageTargetAgencyCount(9, 50), 5);
  assert.equal(stageTargetAgencyCount(9, 100), 9);
});

test("campaign agency count deduplicates approved scope", () => {
  assert.equal(campaignAgencyCount({ approvedScope: { agencyIds: [1, 2, 2, 3] } }), 3);
});

test("ordinary rollout campaign has no recovery evidence constraint", async () => {
  const gate = await recoveryEvidenceStillValid({}, { approvedScope: {} }, { report: {} });
  assert.equal(gate.ready, true);
});

test("stale recovery stabilization cannot promote a completed recovery campaign", async () => {
  const evidence = [{ id: 1, eventType: "recovery_qualification", status: "already_applied", operationId: "op", agencyId: 1, payload: { sourceCampaignId: "failed-1", campaignIndex: 0 }, result: { classification: "already_applied" }, createdAt: new Date("2026-08-26T08:00:00Z") }];
  const prisma = {
    $queryRaw: async (strings) => {
      const sql = Array.isArray(strings) ? strings.join(" ") : String(strings);
      if (sql.includes("recovery_stabilization_snapshot")) return [{ id: 2, operationId: "snap-old", status: "ready", payload: { sourceCampaignId: "failed-1" }, result: { snapshotId: "snap-old", evidenceSignature: "old-signature" }, createdAt: new Date("2026-08-26T08:05:00Z") }];
      return evidence;
    }
  };
  const campaign = { approvedScope: { recoveryOfCampaignId: "failed-1", recoveryStabilizationSnapshotId: "snap-old", recoveryStabilizationEvidenceSignature: "old-signature" } };
  const frozen = { report: { pilotEvidence: { recoveryEvidence: { sourceCampaignId: "failed-1", stabilizationSnapshotId: "snap-old", stabilizationEvidenceSignature: "old-signature" } } } };
  const gate = await recoveryEvidenceStillValid(prisma, campaign, frozen);
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("recovery_stabilization_snapshot_stale"));
});
