"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { ALLOWED_TRANSITIONS } = require("./campaign-store");

test("campaign lifecycle only allows forward controlled transitions", () => {
  assert.equal(ALLOWED_TRANSITIONS.draft.has("approved"), true);
  assert.equal(ALLOWED_TRANSITIONS.approved.has("running"), true);
  assert.equal(ALLOWED_TRANSITIONS.running.has("verifying"), true);
  assert.equal(ALLOWED_TRANSITIONS.verifying.has("completed"), true);
  assert.equal(ALLOWED_TRANSITIONS.completed.size, 0);
  assert.equal(ALLOWED_TRANSITIONS.failed.size, 0);
});

test("campaign lifecycle supports fail-fast from active states", () => {
  for (const state of ["draft", "approved", "running", "verifying"]) {
    assert.equal(ALLOWED_TRANSITIONS[state].has("failed"), true);
  }
});
