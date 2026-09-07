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

test("preview returns deterministic dry-run and approval token without writes", async () => {
  let reads = 0;

  const result = await service.preview({
    snapshotLoader: async () => {
      reads += 1;
      return emptySnapshot();
    },
  });

  assert.equal(reads, 1);
  assert.equal(result.manifestKey, "maurepas-v1");
  assert.equal(result.plan.mode, "dry-run");
  assert.equal(result.plan.writes, false);
  assert.equal(result.plan.destructive, false);
  assert.match(result.approvalToken, /^[a-f0-9]{64}$/);
  assert.deepEqual(
    result.plan.actions.map((action) => action.action),
    ["create_entity", "create_entity", "create_relation"]
  );
});

test("apply accepts only exact preview token and rechecks snapshot before writes", async () => {
  let reads = 0;
  const snapshotLoader = async () => {
    reads += 1;
    return emptySnapshot();
  };

  const preview = await service.preview({ snapshotLoader });
  const writes = [];

  const result = await service.apply({
    approvalToken: preview.approvalToken,
    snapshotLoader,
    createEntity: async (entity) => {
      const id = entity.type === "agency" ? "agency-1" : "person-1";
      writes.push(["entity", id, entity.slug]);
      return { id };
    },
    updateEntity: async () => {
      throw new Error("updateEntity ne doit pas être appelé");
    },
    createRelation: async (sourceId, payload) => {
      writes.push(["relation", sourceId, payload.targetId, payload.relationType]);
      return { id: "relation-1" };
    },
  });

  assert.equal(reads, 3);
  assert.equal(result.mode, "apply");
  assert.equal(result.applied, true);
  assert.deepEqual(writes, [
    ["entity", "agency-1", "mondescale-maurepas"],
    ["entity", "person-1", "anisia-maurepas"],
    ["relation", "person-1", "agency-1", "works_at"],
  ]);
});

test("apply refuses token from stale preview before any write", async () => {
  const preview = await service.preview({
    snapshotLoader: async () => emptySnapshot(),
  });

  const changedSnapshot = {
    entitiesByRef: {
      "agency:maurepas": {
        id: "agency-1",
      },
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
    ],
    existingRelations: [],
  };

  let writes = 0;

  await assert.rejects(
    () =>
      service.apply({
        approvalToken: preview.approvalToken,
        snapshotLoader: async () => changedSnapshot,
        createEntity: async () => {
          writes += 1;
          return { id: "unexpected" };
        },
        updateEntity: async () => {
          writes += 1;
          return { id: "unexpected" };
        },
        createRelation: async () => {
          writes += 1;
          return { id: "unexpected" };
        },
      }),
    /ne correspond pas au plan/
  );

  assert.equal(writes, 0);
});

test("pilot routes are mounted before generic Knowledge id route and expose no delete", () => {
  const routes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/knowledge.routes.js"),
    "utf8"
  );
  const pilotRoutes = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/maurepas-pilot.routes.js"),
    "utf8"
  );
  const pilotService = fs.readFileSync(
    path.join(__dirname, "../src/knowledge/maurepas-pilot.service.js"),
    "utf8"
  );

  assert.ok(routes.indexOf('"/pilots/maurepas"') < routes.indexOf('"/:id"'));
  assert.match(pilotRoutes, /"\/preview"/);
  assert.match(pilotRoutes, /"\/apply"/);
  assert.doesNotMatch(pilotRoutes, /router\.delete/i);
  assert.doesNotMatch(pilotService, /allowExpertise:\s*true/);
  assert.match(pilotService, /allowExpertise:\s*false/);
});
