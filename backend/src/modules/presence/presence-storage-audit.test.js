"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluatePresenceStorage } = require("./presence-storage-audit");

const complete = [
  "PresenceOperationAudit",
  "PresenceOperationSnapshot",
  "PresenceCampaign",
  "PresenceCampaignEvent",
  "PresenceCampaignExecution",
  "PresenceCampaignReport"
].map((tableName) => ({ tableName }));

test("Presence storage requires audit snapshot and campaign tables", () => {
  const ready = evaluatePresenceStorage(complete);
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.missing, []);
});

test("Presence storage reports every missing campaign table", () => {
  const state = evaluatePresenceStorage(complete.filter((row) => row.tableName !== "PresenceCampaignReport"));
  assert.equal(state.ready, false);
  assert.deepEqual(state.missing, ["PresenceCampaignReport"]);
});
