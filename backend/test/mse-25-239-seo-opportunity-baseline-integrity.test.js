"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  prioritizeSearchOpportunities,
} = require("../src/modules/search-console-submission/opportunity-prioritization");

test("MSE-25.239 Search Console opportunity retains real metrics", () => {
  const rows = [{
    dimensions: { query: "voyages" },
    clicks: 3,
    impressions: 120,
    ctr: 0.025,
    position: 8.4,
  }];

  const [opportunity] = prioritizeSearchOpportunities(rows);

  assert.ok(opportunity);
  assert.equal(opportunity.clicks, 3);
  assert.equal(opportunity.impressions, 120);
  assert.equal(opportunity.ctr, 0.025);
  assert.equal(opportunity.position, 8.4);
});

test("MSE-25.239 work queue does not silently encode missing baseline as zero", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../src/modules/search-console-submission/opportunity-work-queue.js"
    ),
    "utf8"
  );

  assert.doesNotMatch(
    source,
    /baseline:\s*\{\s*clicks:\s*opportunity\?\.clicks\s*\|\|\s*0/
  );

  assert.match(source, /impressions: metricOrNull\(opportunity\?\.impressions\)/);
  assert.match(source, /position: metricOrNull\(opportunity\?\.position\)/);
});

test("MSE-25.239 opportunity eligibility still requires genuine GSC evidence", () => {
  assert.deepEqual(
    prioritizeSearchOpportunities([{
      dimensions: { query: "voyages" },
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    }]),
    []
  );

  assert.deepEqual(
    prioritizeSearchOpportunities([{
      dimensions: { query: "voyages" },
      clicks: 0,
      impressions: 19,
      ctr: 0.01,
      position: 8,
    }]),
    []
  );
});

test("MSE-25.239 missing metrics are never semantically represented as zero", () => {
  const fs = require("node:fs");
  const path = require("node:path");

  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../src/modules/search-console-submission/opportunity-work-queue.js"
    ),
    "utf8"
  );

  assert.match(
    source,
    /value === null \|\| value === undefined \|\| value === ""/
  );

  assert.match(source, /clicks: metricOrNull\(opportunity\?\.clicks\)/);
  assert.match(source, /impressions: metricOrNull\(opportunity\?\.impressions\)/);
  assert.match(source, /ctr: metricOrNull\(opportunity\?\.ctr\)/);
  assert.match(source, /position: metricOrNull\(opportunity\?\.position\)/);
});
