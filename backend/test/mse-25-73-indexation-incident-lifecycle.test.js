"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateIncidentLifecycle } = require("../src/modules/search-console-submission/indexation-incident-lifecycle");

test("MSE-25.73 marks unseen incidents as NEW", () => {
  const result = evaluateIncidentLifecycle({ incidents: [{ id: "HTTP_ERROR:https://agences.mondescale.com/agence/dax", code: "HTTP_ERROR", severity: "P0" }], previousRecords: [], observedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(result.summary.newCount, 1);
  assert.equal(result.records[0].state, "NEW");
  assert.equal(result.records[0].occurrenceCount, 1);
  assert.equal(result.records[0].consecutiveObservationCount, 1);
  assert.equal(result.records[0].signalState, "ACTIONABLE");
});

test("MSE-25.73 marks repeated active incidents as PERSISTING", () => {
  const result = evaluateIncidentLifecycle({ incidents: [{ id: "A", code: "HTTP_ERROR" }], previousRecords: [{ id: "A", active: true, state: "NEW", firstSeenAt: "2026-08-26T20:00:00.000Z", lastSeenAt: "2026-08-26T21:00:00.000Z", occurrenceCount: 1, consecutiveObservationCount: 1 }], observedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(result.records[0].state, "PERSISTING");
  assert.equal(result.records[0].occurrenceCount, 2);
  assert.equal(result.records[0].consecutiveObservationCount, 2);
  assert.equal(result.records[0].ageHours, 4);
});

test("MSE-25.73 resolves incidents missing from the new observation", () => {
  const result = evaluateIncidentLifecycle({ incidents: [], previousRecords: [{ id: "A", active: true, state: "PERSISTING", firstSeenAt: "2026-08-26T20:00:00.000Z", lastSeenAt: "2026-08-26T23:00:00.000Z", occurrenceCount: 3, consecutiveObservationCount: 3 }], observedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(result.summary.activeCount, 0);
  assert.equal(result.summary.resolvedCount, 1);
  assert.equal(result.records[0].state, "RESOLVED");
  assert.equal(result.records[0].signalState, "RESOLVED");
});

test("MSE-25.73 marks a previously resolved incident as REOPENED", () => {
  const result = evaluateIncidentLifecycle({ incidents: [{ id: "A", code: "CANONICAL_RUNTIME_MISMATCH" }], previousRecords: [{ id: "A", active: false, state: "RESOLVED", firstSeenAt: "2026-08-20T00:00:00.000Z", lastSeenAt: "2026-08-21T00:00:00.000Z", resolvedAt: "2026-08-22T00:00:00.000Z", occurrenceCount: 2, reopenCount: 0 }], observedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(result.records[0].state, "REOPENED");
  assert.equal(result.records[0].reopenCount, 1);
  assert.equal(result.records[0].consecutiveObservationCount, 1);
  assert.equal(result.invariants.automaticRemediation, false);
});

test("MSE-25.73 keeps first observation-unavailable signal transient", () => {
  const first = evaluateIncidentLifecycle({ incidents: [{ id: "OBS:A", code: "OBSERVATION_UNAVAILABLE", severity: "P3" }], previousRecords: [], observedAt: "2026-08-27T00:00:00.000Z" });
  assert.equal(first.records[0].signalState, "TRANSIENT");
  assert.equal(first.summary.transientCount, 1);
  const second = evaluateIncidentLifecycle({ incidents: [{ id: "OBS:A", code: "OBSERVATION_UNAVAILABLE", severity: "P3" }], previousRecords: first.records, observedAt: "2026-08-27T01:00:00.000Z" });
  assert.equal(second.records[0].signalState, "ACTIONABLE");
  assert.equal(second.records[0].state, "PERSISTING");
  assert.equal(second.summary.actionableCount, 1);
});
