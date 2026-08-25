"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildRecoveryPlan, evaluateRecoveryEligibility, evaluateRecoveryQualificationState } = require("./campaign-recovery");

const source = {
  campaignId: "source-1",
  status: "failed",
  pilot: true,
  preflightId: "pf-old",
  approvedScope: { rolloutStage: 50, sourceEvidenceCampaignId: "stage25", sourceEvidenceReportId: "report25", sourceEvidenceReportCreatedAt: "2026-08-25T10:00:00.000Z" },
  plan: { executable: [
    { agencyId: 1, providerKey: "google_business_profile", remediationKind: "managed_api", drift: ["phone"] },
    { agencyId: 2, providerKey: "google_business_profile", remediationKind: "managed_api", drift: ["website"] },
    { agencyId: 3, providerKey: "google_business_profile", remediationKind: "managed_api", drift: ["phone"] }
  ] }
};

const cockpit = { health: { score: 90 }, summary: { coveragePercent: 88, anomalies: 2 } };

test("recovery plan excludes every item that has already entered execution", () => {
  const executions = [{ campaignIndex: 0, agencyId: 1, status: "submitted", operationId: "op-1" }, { campaignIndex: 1, agencyId: 2, status: "failed", operationId: "op-2" }];
  const plan = buildRecoveryPlan(source, cockpit, executions, "pf-new");
  assert.equal(plan.executableCount, 1);
  assert.equal(plan.executable[0].agencyId, 3);
  assert.equal(plan.executable[0].sourceCampaignIndex, 2);
  assert.deepEqual(plan.policy.agencyIds, [3]);
});

test("failed campaign requires a new frozen preflight before recovery", () => {
  const same = evaluateRecoveryEligibility(source, [], { preflightId: "pf-old" });
  assert.equal(same.ready, false);
  assert.ok(same.blockers.includes("fresh_preflight_required_after_failure"));
  const fresh = evaluateRecoveryEligibility(source, [], { preflightId: "pf-new" });
  assert.equal(fresh.ready, true);
});

test("failed or operation-bearing executions are surfaced as uncertain and never auto-retried", () => {
  const gate = evaluateRecoveryEligibility(source, [{ campaignIndex: 1, agencyId: 2, status: "failed", operationId: "op-2" }], { preflightId: "pf-new" });
  assert.equal(gate.uncertainCount, 1);
  assert.equal(gate.uncertain[0].operationId, "op-2");
});

test("recovery qualification state blocks until every ambiguous item has explicit evidence", () => {
  const uncertain = [{ campaignIndex: 0, agencyId: 1, operationId: "op-1", status: "failed" }, { campaignIndex: 1, agencyId: 2, operationId: "op-2", status: "failed" }];
  const partial = evaluateRecoveryQualificationState(uncertain, [{ status: "already_applied", payload: { campaignIndex: 0 }, result: { classification: "already_applied" } }]);
  assert.equal(partial.complete, false);
  assert.equal(partial.unresolvedCount, 1);
  const complete = evaluateRecoveryQualificationState(uncertain, [
    { status: "already_applied", payload: { campaignIndex: 0 }, result: { classification: "already_applied" } },
    { status: "not_applied", payload: { campaignIndex: 1 }, result: { classification: "not_applied" } }
  ]);
  assert.equal(complete.complete, true);
  assert.equal(complete.manualInterventionRequired, true);
  assert.equal(complete.manualCount, 1);
});
