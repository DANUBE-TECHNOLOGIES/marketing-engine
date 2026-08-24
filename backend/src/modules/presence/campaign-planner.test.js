"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildCampaignPlan } = require("./campaign-planner");

const input = {
  agencies: [{ id: 1, name: "Gien", city: "Gien" }, { id: 2, name: "Nevers", city: "Nevers" }],
  directories: [{ id: 10, name: "PagesJaunes", active: true, impactScore: 5, priority: 5, difficulty: 2 }],
  listings: [{ id: 100, agencyId: 1, directoryId: 10, status: "pending", nameCorrect: true, addressCorrect: true, phoneCorrect: false, websiteCorrect: true, categoryCorrect: true, hoursCorrect: true }],
  pendingPropagation: [],
  actions: []
};

test("campaign plan can be scoped to agencies and providers", () => {
  const plan = buildCampaignPlan(input, { agencyIds: [1], providerKeys: ["pagesjaunes"], maxItems: 10 });
  assert.equal(plan.selectedCount, 1);
  assert.equal(plan.selected[0].agencyId, 1);
  assert.equal(plan.selected[0].providerKey, "pagesjaunes");
  assert.ok(plan.campaignId.startsWith("presence-"));
});

test("campaign excludes sensitive name/address drift unless explicitly allowed", () => {
  const sensitive = { ...input, listings: [{ ...input.listings[0], nameCorrect: false, phoneCorrect: true }] };
  const blocked = buildCampaignPlan(sensitive, { agencyIds: [1], providerKeys: ["pagesjaunes"] });
  assert.equal(blocked.selectedCount, 0);
  const allowed = buildCampaignPlan(sensitive, { agencyIds: [1], providerKeys: ["pagesjaunes"], allowSensitive: true });
  assert.equal(allowed.selectedCount, 1);
});
