"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const service = require("../src/knowledge/maurepas-pilot.service");

function emptySnapshot() {
  return {
    entitiesByRef: {},
    existingEntities: [],
    existingRelations: [],
  };
}

test("read-only report summarizes missing Maurepas Knowledge facts without writes", async () => {
  let reads = 0;
  let writes = 0;

  const result = await service.report({
    snapshotLoader: async () => {
      reads += 1;
      return emptySnapshot();
    },
    createEntity: async () => { writes += 1; },
    updateEntity: async () => { writes += 1; },
    createRelation: async () => { writes += 1; },
  });

  assert.equal(reads, 1);
  assert.equal(writes, 0);
  assert.equal(result.mode, "read-only");
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.manifestKey, "maurepas");
  assert.deepEqual(result.summary, {
    entity: {
      missing: 2,
      updateRequired: 0,
      compliant: 0,
    },
    relation: {
      missing: 1,
      compliant: 0,
    },
    actionable: 3,
    noop: 0,
  });
});

test("read-only report identifies a fully reconciled graph as noop", async () => {
  const snapshot = {
    entitiesByRef: {
      "agency:maurepas": { id: "agency-1" },
      "person:anisia": { id: "person-1" },
    },
    existingEntities: [
      {
        id: "agency-1",
        type: "agency",
        slug: "mondescale-maurepas",
        title: "Mondescale Maurepas",
        status: "published",
        language: "fr",
        summary: "Agence de voyages Mondescale à Maurepas.",
      },
      {
        id: "person-1",
        type: "person",
        slug: "anisia-maurepas",
        title: "Anisia",
        status: "published",
        language: "fr",
        summary: "Conseillère de l'agence Mondescale Maurepas.",
      },
    ],
    existingRelations: [
      {
        sourceId: "person-1",
        targetId: "agency-1",
        relationType: "works_at",
      },
    ],
  };

  const result = await service.report({
    snapshotLoader: async () => snapshot,
  });

  assert.equal(result.summary.actionable, 0);
  assert.equal(result.summary.noop, 3);
  assert.equal(result.summary.entity.compliant, 2);
  assert.equal(result.summary.relation.compliant, 1);
});

test("Maurepas report exposes no validated expertise and plans no expert_in", async () => {
  const result = await service.report({
    snapshotLoader: async () => emptySnapshot(),
  });

  assert.equal(result.expertiseValidated, 0);
  assert.equal(result.expertInPlanned, false);
  assert.equal(
    result.actions.some((action) => action.relationType === "expert_in"),
    false
  );
});

test("report endpoint is GET-only and does not call apply", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/maurepas-pilot.routes.js"),
    "utf8"
  );

  assert.match(routes, /router\.get\(\s*"\/report"/s);
  assert.doesNotMatch(routes, /router\.post\(\s*"\/report"/s);
  assert.doesNotMatch(routes, /router\.delete\(\s*"\/report"/s);
});
