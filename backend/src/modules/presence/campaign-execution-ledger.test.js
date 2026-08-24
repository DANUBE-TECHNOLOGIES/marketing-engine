"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { isTerminalExecutionStatus } = require("./campaign-execution-ledger");

test("campaign ledger terminal states prevent duplicate writes", () => {
  assert.equal(isTerminalExecutionStatus("submitted"), true);
  assert.equal(isTerminalExecutionStatus("verified"), true);
  assert.equal(isTerminalExecutionStatus("skipped"), true);
  assert.equal(isTerminalExecutionStatus("failed"), false);
  assert.equal(isTerminalExecutionStatus("blocked_sensitive"), false);
  assert.equal(isTerminalExecutionStatus("planned"), false);
});
