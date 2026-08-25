"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateSourceEvidenceBinding, sameTimestamp } = require("./rollout-promotion-gate");

test("source evidence timestamp comparison is stable across equivalent date representations", () => {
  assert.equal(sameTimestamp("2026-08-25T10:00:00.000Z", new Date("2026-08-25T10:00:00Z")), true);
  assert.equal(sameTimestamp("2026-08-25T10:00:00.000Z", "2026-08-25T10:00:01.000Z"), false);
});

test("canary campaign requires no predecessor evidence", async () => {
  const gate = await evaluateSourceEvidenceBinding({}, { pilot: true, approvedScope: { agencyIds: [1], maxItems: 1, rolloutStage: null, sourceEvidenceCampaignId: null } }, 9);
  assert.equal(gate.ready, true);
  assert.equal(gate.required, false);
});

test("promoted campaign is blocked when frozen source report is missing", async () => {
  const prisma = { $queryRaw: async () => [] };
  const campaign = {
    pilot: true,
    approvedScope: {
      agencyIds: [1,2,3],
      maxItems: 3,
      rolloutStage: null,
      sourceEvidenceCampaignId: "canary-1",
      sourceEvidenceReportId: "report-1",
      sourceEvidenceReportCreatedAt: "2026-08-25T10:00:00.000Z"
    }
  };
  const gate = await evaluateSourceEvidenceBinding(prisma, campaign, 9);
  assert.equal(gate.ready, false);
  assert.ok(gate.blockers.includes("source_evidence_frozen_report_missing"));
  assert.ok(gate.blockers.includes("source_canary_no_longer_authorized"));
});
