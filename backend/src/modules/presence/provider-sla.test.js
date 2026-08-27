"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { getProviderSla, classifyAgainstSla } = require("./provider-sla");

test("Google SLA classifies normal slow stale and critical propagation", () => {
  const sla = getProviderSla("google_business_profile");
  assert.equal(classifyAgainstSla(60 * 60 * 1000, sla), "normal");
  assert.equal(classifyAgainstSla(7 * 60 * 60 * 1000, sla), "slow");
  assert.equal(classifyAgainstSla(25 * 60 * 60 * 1000, sla), "stale");
  assert.equal(classifyAgainstSla(73 * 60 * 60 * 1000, sla), "critical");
});

test("provider SLA accepts explicit thresholds", () => {
  const sla = getProviderSla("google_business_profile", { warnAfterMs: 100, staleAfterMs: 200, criticalAfterMs: 300 });
  assert.equal(classifyAgainstSla(250, sla), "stale");
});
