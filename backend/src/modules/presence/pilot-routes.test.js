"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { mergePilotReadiness } = require("./pilot-routes");

test("pilot preview remains no-go when activation gate is red", () => {
  const merged = mergePilotReadiness(
    { ready: true, decision: "go", blockers: [], warnings: ["scope_warning"] },
    { ready: false, decision: "NO-GO", blockers: ["frozen_preflight_missing"], warnings: [] }
  );
  assert.equal(merged.ready, false);
  assert.equal(merged.decision, "no_go");
  assert.ok(merged.blockers.includes("frozen_preflight_missing"));
  assert.ok(merged.warnings.includes("scope_warning"));
});

test("pilot preview is go only when scope and activation gates are both green", () => {
  const merged = mergePilotReadiness(
    { ready: true, decision: "go", blockers: [], warnings: [] },
    { ready: true, decision: "GO", blockers: [], warnings: [] }
  );
  assert.equal(merged.ready, true);
  assert.equal(merged.decision, "go");
});
