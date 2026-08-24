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
  "PresenceCampaignReport",
  "PresenceCitationObservation"
].map((tableName) => ({ tableName }));

test("Presence storage requires audit snapshot campaign and citation observation tables", () => {
  const ready = evaluatePresenceStorage(complete);
  assert.equal(ready.ready, true);
  assert.deepEqual(ready.missing, []);
});

test("Presence storage reports missing citation observation table", () => {
  const state = evaluatePresenceStorage(complete.filter((row) => row.tableName !== "PresenceCitationObservation"));
  assert.equal(state.ready, false);
  assert.deepEqual(state.missing, ["PresenceCitationObservation"]);
});
