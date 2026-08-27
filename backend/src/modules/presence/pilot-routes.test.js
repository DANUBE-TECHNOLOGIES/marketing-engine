"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { mergePilotReadiness, normalizeRolloutStage } = require("./pilot-routes");

test("pilot preview remains no-go when activation gate is red", () => {
  const merged = mergePilotReadiness(
    { ready: true, decision: "go", blockers: [], warnings: ["scope_warning"] },
    { ready: false, decision: "NO-GO", blockers: ["frozen_preflight_missing"], warnings: [] }
  );
  assert.equal(merged.ready, false);
  assert.ok(merged.blockers.includes("frozen_preflight_missing"));
  assert.ok(merged.warnings.includes("scope_warning"));
});

test("pilot preview is go only when scope and activation gates are green", () => {
  const merged = mergePilotReadiness(
    { ready: true, blockers: [], warnings: [] },
    { ready: true, blockers: [], warnings: [] }
  );
  assert.equal(merged.ready, true);
  assert.equal(merged.decision, "go");
});

test("network rollout accepts only staged 50 and 100 percent requests", () => {
  assert.equal(normalizeRolloutStage(50), 50);
  assert.equal(normalizeRolloutStage("100"), 100);
  assert.equal(normalizeRolloutStage(25), null);
  assert.equal(normalizeRolloutStage(75), null);
});

test("network rollout remains no-go when requested stage is not the authorized next stage", () => {
  const merged = mergePilotReadiness(
    { ready: true, blockers: [], warnings: [] },
    { ready: true, blockers: [], warnings: [] },
    null,
    { ready: true, nextStagePercent: 50, blockers: [] },
    100
  );
  assert.equal(merged.ready, false);
  assert.ok(merged.blockers.includes("network_rollout_stage_not_authorized"));
});
