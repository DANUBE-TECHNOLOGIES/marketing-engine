"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SAFE_NEXT_ACTIONS,
  certifyOperationalStatus,
} = require("../scripts/mse-25-83-operational-certification");

function safeStatus(overrides = {}) {
  return {
    ok: true,
    certified: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    searchConsole: {
      dataState: "NO_DATA_YET",
      lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    },
    safety: {
      executableCount: 0,
      automaticWriteCount: 0,
      pageCreationCount: 0,
      publicationCount: 0,
      websiteDesignerMutationCount: 0,
    },
    downstream: { summary: { unsafeCount: 0 } },
    humanGate: { required: false, automaticDecision: false },
    nextAction: "WAIT_FOR_SEARCH_CONSOLE_DATA",
    reportPath: "/tmp/mse-25-operational-status.json",
    ...overrides,
  };
}

test("MSE-25.83 certifies a read-only waiting state without inventing Search Console demand", () => {
  const result = certifyOperationalStatus(safeStatus());
  assert.equal(result.certified, true);
  assert.equal(result.searchDataState, "NO_DATA_YET");
  assert.equal(result.nextAction, "WAIT_FOR_SEARCH_CONSOLE_DATA");
  assert.equal(result.humanGateRequired, false);
  assert.equal(result.writes, false);
  assert.equal(result.publicWrites, false);
});

test("MSE-25.83 accepts human-review states but never turns them into automatic decisions", () => {
  const result = certifyOperationalStatus(
    safeStatus({
      searchConsole: { dataState: "DATA_AVAILABLE", lifecycleState: "REVIEW_READY" },
      humanGate: { required: true, automaticDecision: false },
      nextAction: "HUMAN_REVIEW_REQUIRED",
    })
  );
  assert.equal(result.humanGateRequired, true);
  assert.equal(result.nextAction, "HUMAN_REVIEW_REQUIRED");
});

test("MSE-25.83 fails closed on any automatic or public write signal", () => {
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ writes: true })),
    /reports writes/
  );
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ publicWrites: true })),
    /public writes/
  );
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ safety: { ...safeStatus().safety, automaticWriteCount: 1 } })),
    /automaticWriteCount/
  );
});

test("MSE-25.83 fails closed on unsafe downstream stages or automatic human decisions", () => {
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ downstream: { summary: { unsafeCount: 1 } } })),
    /Unsafe downstream stage/
  );
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ humanGate: { required: true, automaticDecision: true } })),
    /must never make an automatic decision/
  );
});

test("MSE-25.83 only accepts known lifecycle next actions", () => {
  assert.equal(SAFE_NEXT_ACTIONS.has("WAIT_FOR_SEARCH_CONSOLE_DATA"), true);
  assert.equal(SAFE_NEXT_ACTIONS.has("HUMAN_REVIEW_REQUIRED"), true);
  assert.throws(
    () => certifyOperationalStatus(safeStatus({ nextAction: "AUTO_PUBLISH_ALL" })),
    /Unknown operational next action/
  );
});
