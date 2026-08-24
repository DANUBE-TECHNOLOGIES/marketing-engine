"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNetworkCockpit, priorityBand } = require("./network-cockpit");

const agencies = [{ id: 1, name: "Gien", city: "Gien" }];
const directories = [{ id: 10, name: "Google Business Profile", active: true, impactScore: 5, priority: 5, difficulty: 1 }];
const listings = [{ id: 100, agencyId: 1, directoryId: 10, status: "pending", nameCorrect: true, addressCorrect: true, phoneCorrect: false, websiteCorrect: true, categoryCorrect: true, hoursCorrect: true }];

test("priority bands are deterministic", () => {
  assert.equal(priorityBand(130), "critical");
  assert.equal(priorityBand(90), "high");
  assert.equal(priorityBand(50), "medium");
  assert.equal(priorityBand(20), "low");
});

test("cockpit merges NAP anomalies, propagation and open actions", () => {
  const cockpit = buildNetworkCockpit({
    agencies,
    directories,
    listings,
    pendingPropagation: [{ agencyId: 1, agencyName: "Gien", listingId: 100, propagation: { ageMs: 80 * 60 * 60 * 1000, state: "stale" } }],
    actions: [{ id: 4, agencyId: 1, lever: "presence_google_propagation", title: "Escalade Google", status: "todo", agency: { name: "Gien" } }],
    env: { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" }
  });
  assert.equal(cockpit.summary.agencies, 1);
  assert.equal(cockpit.summary.anomalies, 1);
  assert.ok(cockpit.interventionQueue.some((item) => item.source === "nap_anomaly"));
  assert.ok(cockpit.interventionQueue.some((item) => item.source === "propagation"));
  assert.ok(cockpit.interventionQueue.some((item) => item.source === "network_action"));
  assert.equal(cockpit.interventionQueue[0].priority, "critical");
});
