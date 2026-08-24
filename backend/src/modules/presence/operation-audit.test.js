"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createOperationId } = require("./operation-audit");

test("Presence operation ids are namespaced and unique", () => {
  const first = createOperationId("google_remediation");
  const second = createOperationId("google_remediation");
  assert.match(first, /^google_remediation_\d+_[0-9a-f]{12}$/);
  assert.notEqual(first, second);
});
