"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { requestedDriftState } = require("./campaign-recovery-qualification");

test("recovery qualification recognizes an already applied ambiguous write", () => {
  const state = requestedDriftState({ drift: [] }, ["phone", "website"]);
  assert.equal(state.classification, "already_applied");
  assert.deepEqual(state.remaining, []);
  assert.deepEqual(state.matched, ["phone", "website"]);
});

test("recovery qualification recognizes a write that is still not applied", () => {
  const state = requestedDriftState({ drift: ["phone", "website"] }, ["phone", "website"]);
  assert.equal(state.classification, "not_applied");
  assert.deepEqual(state.remaining, ["phone", "website"]);
});

test("recovery qualification keeps partial remote state ambiguous", () => {
  const state = requestedDriftState({ drift: ["phone"] }, ["phone", "website"]);
  assert.equal(state.classification, "partial_or_changed");
  assert.deepEqual(state.remaining, ["phone"]);
  assert.deepEqual(state.matched, ["website"]);
});
