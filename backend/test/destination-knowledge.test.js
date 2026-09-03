"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateKnowledgePayload } = require("../src/lib/knowledge/validators");
const { createKnowledgeService } = require("../src/lib/knowledge/service");

const validPayload = {
  destinationSlug: "budapest",
  knowledge: { currencyCode: "huf", bestMonths: [9, 5, 5], flightDurationMin: 120, flightDurationMax: 150, status: "review" },
  climateMonths: [{ month: 5, temperatureMinC: 12, temperatureMaxC: 22, comfortScore: 88 }],
  travelProfile: { coupleScore: 92, suitableFor: ["couples", "couples"] },
  budgetProfile: { dailyBudgetLow: 50, dailyBudgetMid: 100, dailyBudgetHigh: 200 },
};

test("validates and normalizes a complete payload", () => {
  const result = validateKnowledgePayload(validPayload);
  assert.equal(result.valid, true);
  assert.equal(result.data.knowledge.currencyCode, "HUF");
  assert.deepEqual(result.data.knowledge.bestMonths, [5, 9]);
  assert.deepEqual(result.data.travelProfile.suitableFor, ["couples"]);
});

test("rejects invalid scores, months and budget order", () => {
  const result = validateKnowledgePayload({
    destinationSlug: "x",
    climateMonths: [{ month: 13 }],
    travelProfile: { familyScore: 101 },
    budgetProfile: { dailyBudgetLow: 200, dailyBudgetMid: 100 },
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 3);
});

test("rejects duplicate climate months", () => {
  const result = validateKnowledgePayload({ destinationSlug: "x", climateMonths: [{ month: 1 }, { month: 1 }] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /plusieurs fois/);
});

test("service persists knowledge transactionally", async () => {
  const calls = [];
  const tx = {
    destinationKnowledge: { upsert: async (args) => calls.push(["knowledge", args]) },
    destinationClimateMonth: { upsert: async (args) => calls.push(["climate", args]) },
    destinationTravelProfile: { upsert: async (args) => calls.push(["travel", args]) },
    destinationBudgetProfile: { upsert: async (args) => calls.push(["budget", args]) },
  };
  const prisma = {
    destination: {
      findUnique: async (args) => args.select ? { id: "d1", slug: "budapest" } : { id: "d1", slug: "budapest", knowledge: {} },
    },
    $transaction: async (fn) => fn(tx),
  };
  const service = createKnowledgeService(prisma);
  await service.upsertDestinationKnowledge(validPayload);
  assert.deepEqual(calls.map(([type]) => type), ["knowledge", "climate", "travel", "budget"]);
});

test("service reports missing destination", async () => {
  const prisma = { destination: { findUnique: async () => null }, $transaction: async () => { throw new Error("not expected"); } };
  const service = createKnowledgeService(prisma);
  await assert.rejects(() => service.upsertDestinationKnowledge(validPayload), (error) => error.code === "DESTINATION_NOT_FOUND" && error.status === 404);
});
