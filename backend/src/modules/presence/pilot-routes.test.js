"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { mergePilotReadiness, CANARY_MAX_AGENCIES, CANARY_MAX_ITEMS } = require("./pilot-routes");
const canaryPlan = { selectedCount: 1, executableCount: 1 };

test("pilot preview remains no-go when activation gate is red", () => {
  const merged = mergePilotReadiness(
    { ready: true, decision: "go", blockers: [], warnings: ["scope_warning"] },
    { ready: false, decision: "NO-GO", blockers: ["frozen_preflight_missing"], warnings: [] },
    canaryPlan
  );
  assert.equal(merged.ready, false);
  assert.ok(merged.blockers.includes("frozen_preflight_missing"));
});

test("canary preview is go only with exactly one executable item", () => {
  const merged = mergePilotReadiness({ ready: true, blockers: [], warnings: [] }, { ready: true, blockers: [], warnings: [] }, canaryPlan);
  assert.equal(merged.ready, true);
  assert.equal(merged.pilotPhase, "canary");
  assert.equal(CANARY_MAX_AGENCIES, 1);
  assert.equal(CANARY_MAX_ITEMS, 1);
});

test("canary blocks zero or multiple selected items", () => {
  const zero = mergePilotReadiness({ ready: true, blockers: [], warnings: [] }, { ready: true, blockers: [], warnings: [] }, { selectedCount: 0, executableCount: 0 });
  const many = mergePilotReadiness({ ready: true, blockers: [], warnings: [] }, { ready: true, blockers: [], warnings: [] }, { selectedCount: 2, executableCount: 2 });
  assert.equal(zero.ready, false);
  assert.equal(many.ready, false);
  assert.ok(many.blockers.includes("canary_requires_exactly_one_item"));
});
