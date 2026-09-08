const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const coverage = require("../src/knowledge/network-agency-knowledge-coverage.service");

function matrix() {
  return {
    mode: "read-only",
    targets: [
      { id: "d1", type: "destination", slug: "sicile", title: "Sicile" },
      { id: "t1", type: "travel_theme", slug: "circuits", title: "Circuits" },
    ],
    agencies: [
      {
        agency: { id: "a1", slug: "mondescale-a1", title: "Agence A1" },
        relations: [
          { relationType: "recommends", target: { id: "d1" } },
          { relationType: "features", target: { id: "t1" } },
        ],
      },
      {
        agency: { id: "a2", slug: "mondescale-a2", title: "Agence A2" },
        relations: [
          { relationType: "available_in", target: { id: "d1" } },
        ],
      },
      {
        agency: { id: "a3", slug: "mondescale-a3", title: "Agence A3" },
        relations: [],
      },
    ],
  };
}

test("coverage derives exact relation states without inference", () => {
  const result = coverage.buildCoverage(matrix());
  const sicile = result.items.find((item) => item.target.id === "d1");
  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.inference, false);
  assert.equal(sicile.agencyCount, 3);
  assert.equal(sicile.coveredCount, 2);
  assert.equal(sicile.missingCount, 1);
  assert.equal(sicile.coverageRate, 66.7);
  assert.deepEqual(sicile.recommends.map((item) => item.id), ["a1"]);
  assert.deepEqual(sicile.features, []);
  assert.deepEqual(sicile.availableInOnly.map((item) => item.id), ["a2"]);
  assert.deepEqual(sicile.missingAgencyKnowledgeIds, ["a3"]);
});

test("coverage sorts largest gaps first and keeps target facts unchanged", () => {
  const result = coverage.buildCoverage(matrix());
  assert.equal(result.items[0].target.id, "t1");
  assert.equal(result.items[0].coverageRate, 33.3);
  assert.equal(result.items[1].target.slug, "sicile");
});

test("same Agency can be recommends and features without double-counting coverage", () => {
  const input = matrix();
  input.agencies[0].relations.push({ relationType: "features", target: { id: "d1" } });
  const sicile = coverage.buildCoverage(input).items.find((item) => item.target.id === "d1");
  assert.equal(sicile.recommends.length, 1);
  assert.equal(sicile.features.length, 1);
  assert.equal(sicile.coveredCount, 2);
});

test("coverage report reuses the canonical V1.25 matrix loader", async () => {
  let calls = 0;
  const result = await coverage.report({ matrixLoader: async () => { calls += 1; return matrix(); } });
  assert.equal(calls, 1);
  assert.equal(result.summary.agencyCount, 3);
  assert.equal(result.summary.targetCount, 2);
});

test("coverage route is GET-only and exposes no mutation", () => {
  const routes = fs.readFileSync(path.join(__dirname, "../src/knowledge/network-geo.routes.js"), "utf8");
  assert.match(routes, /router\.get\("\/agency-knowledge-coverage"/);
  assert.doesNotMatch(routes, /router\.post\("\/agency-knowledge-coverage"/);
  assert.doesNotMatch(routes, /router\.delete\("\/agency-knowledge-coverage"/);
});
