"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildCatalogReconciliation } = require("./provider-catalog-reconcile");

test("catalog reconciliation proposes missing providers without mutating existing ones", () => {
  const plan = buildCatalogReconciliation([{ id: 1, name: "Google Business Profile", website: "https://business.google.com/", category: "map", impactScore: 10, difficulty: 1, priority: 100, active: true }]);
  assert.ok(plan.creates.some((item) => item.providerKey === "pagesjaunes"));
  assert.ok(plan.creates.some((item) => item.providerKey === "apple_business_connect"));
});

test("catalog reconciliation reports metadata drift separately", () => {
  const plan = buildCatalogReconciliation([{ id: 1, name: "PagesJaunes", website: "https://wrong.example/", category: "general", impactScore: 1, difficulty: 9, priority: 1, active: true }]);
  const drift = plan.metadataDrift.find((item) => item.providerKey === "pagesjaunes");
  assert.ok(drift);
  assert.ok(drift.drift.some((item) => item.field === "website"));
  assert.ok(drift.drift.some((item) => item.field === "priority"));
});
