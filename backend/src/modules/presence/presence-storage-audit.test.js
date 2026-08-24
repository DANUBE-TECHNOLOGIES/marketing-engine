"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluatePresenceStorage } = require("./presence-storage-audit");

test("Presence storage requires both audit and snapshot tables", () => {
  const ready = evaluatePresenceStorage([
    { tableName: "PresenceOperationAudit" },
    { tableName: "PresenceOperationSnapshot" }
  ]);
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.missing, []);
});

test("Presence storage reports missing snapshot table", () => {
  const state = evaluatePresenceStorage([{ tableName: "PresenceOperationAudit" }]);
  assert.equal(state.ready, false);
  assert.deepEqual(state.missing, ["PresenceOperationSnapshot"]);
});
