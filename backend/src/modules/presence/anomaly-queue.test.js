"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildAnomalyQueue } = require("./anomaly-queue");

test("anomaly queue prioritizes missing high-impact citations", () => {
  const agencies = [{ id: 1, name: "Gien", city: "Gien" }];
  const directories = [
    { id: 10, name: "PagesJaunes", active: true, impactScore: 9, priority: 90, difficulty: 2 },
    { id: 11, name: "Mappy", active: true, impactScore: 4, priority: 20, difficulty: 2 }
  ];
  const listings = [{ id: 100, agencyId: 1, directoryId: 11, status: "pending", nameCorrect: true, addressCorrect: true, phoneCorrect: false, websiteCorrect: true, categoryCorrect: true, hoursCorrect: true }];
  const queue = buildAnomalyQueue(agencies, directories, listings);
  assert.equal(queue.length, 2);
  assert.equal(queue[0].providerKey, "pagesjaunes");
  assert.equal(queue[0].status, "missing");
  assert.equal(queue[1].drift.includes("phone"), true);
});

test("validated citation with no drift is excluded", () => {
  const queue = buildAnomalyQueue(
    [{ id: 1, name: "Gien", city: "Gien" }],
    [{ id: 10, name: "PagesJaunes", active: true, impactScore: 9, priority: 90, difficulty: 2 }],
    [{ id: 1, agencyId: 1, directoryId: 10, status: "validated", nameCorrect: true, addressCorrect: true, phoneCorrect: true, websiteCorrect: true, categoryCorrect: true, hoursCorrect: true }]
  );
  assert.equal(queue.length, 0);
});
