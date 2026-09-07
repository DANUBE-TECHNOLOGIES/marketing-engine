const test = require("node:test");
const assert = require("node:assert/strict");

const manifest = require("../src/knowledge/pilots/maurepas.manifest");
const {
  buildKnowledgePilotPlan,
  validateManifest,
} = require("../src/knowledge/pilot-planner");
const {
  loadKnowledgeSnapshot,
} = require("../src/knowledge/knowledge-pilot-readonly");

test("Maurepas manifest contains only explicit agency/person facts and no expertise", () => {
  assert.equal(validateManifest(manifest), true);
  assert.deepEqual(
    manifest.entities.map((entity) => entity.type),
    ["agency", "person"]
  );
  assert.deepEqual(manifest.expertise, []);
  assert.deepEqual(manifest.relations, [
    {
      sourceRef: "person:anisia",
      targetRef: "agency:maurepas",
      relationType: "works_at",
    },
  ]);
});

test("empty Knowledge graph produces deterministic create-only dry-run plan", () => {
  const plan = buildKnowledgePilotPlan({ manifest });

  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.writes, false);
  assert.equal(plan.destructive, false);
  assert.deepEqual(
    plan.actions.map((action) => action.action),
    ["create_entity", "create_entity", "create_relation"]
  );
  assert.equal(plan.actions[2].sourceId, null);
  assert.equal(plan.actions[2].targetId, null);
});

test("already reconciled Knowledge graph becomes a noop plan", () => {
  const existingEntities = [
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
  ];

  const existingRelations = [
    {
      sourceId: "person-1",
      targetId: "agency-1",
      relationType: "works_at",
    },
  ];

  const plan = buildKnowledgePilotPlan({
    manifest,
    existingEntities,
    existingRelations,
  });

  assert.deepEqual(
    plan.actions.map((action) => action.action),
    ["noop_entity", "noop_entity", "noop_relation"]
  );
});

test("planner resolves entities only by exact slug + language, never by similar title", () => {
  const plan = buildKnowledgePilotPlan({
    manifest,
    existingEntities: [
      {
        id: "wrong-person",
        type: "person",
        slug: "anisia-autre-agence",
        title: "Anisia",
        status: "published",
        language: "fr",
        summary: "Conseillère ailleurs.",
      },
    ],
  });

  const personAction = plan.actions.find(
    (action) => action.ref === "person:anisia"
  );

  assert.equal(personAction.action, "create_entity");
});

test("planner never creates inferred expert_in relations", () => {
  const plan = buildKnowledgePilotPlan({ manifest });
  assert.equal(
    plan.actions.some((action) => action.relationType === "expert_in"),
    false
  );
});

test("manifest rejects unvalidated expertise injection", () => {
  assert.throws(
    () =>
      validateManifest({
        ...manifest,
        expertise: ["croisiere"],
      }),
    /explicitement validées/
  );
});

test("read-only adapter resolves exact refs and existing works_at without writes", async () => {
  const calls = [];
  const repository = {
    async findBySlugAndLanguage(slug, language) {
      calls.push(["findBySlugAndLanguage", slug, language]);
      if (slug === "mondescale-maurepas") {
        return { id: "agency-1", slug, language, type: "agency", title: "Mondescale Maurepas", status: "published", summary: "Agence de voyages Mondescale à Maurepas." };
      }
      if (slug === "anisia-maurepas") {
        return { id: "person-1", slug, language, type: "person", title: "Anisia", status: "published", summary: "Conseillère de l'agence Mondescale Maurepas." };
      }
      return null;
    },
    async findById(id) {
      calls.push(["findById", id]);
      return {
        id,
        outgoingRelations: id === "person-1"
          ? [{ sourceId: "person-1", targetId: "agency-1", relationType: "works_at" }]
          : [],
      };
    },
    create() { throw new Error("write forbidden"); },
    update() { throw new Error("write forbidden"); },
    remove() { throw new Error("write forbidden"); },
  };

  const snapshot = await loadKnowledgeSnapshot(manifest, { repository });
  const plan = buildKnowledgePilotPlan({
    manifest,
    existingEntities: snapshot.existingEntities,
    existingRelations: snapshot.existingRelations,
  });

  assert.equal(snapshot.entitiesByRef["agency:maurepas"].id, "agency-1");
  assert.equal(snapshot.entitiesByRef["person:anisia"].id, "person-1");
  assert.deepEqual(snapshot.existingRelations, [
    { sourceId: "person-1", targetId: "agency-1", relationType: "works_at" },
  ]);
  assert.deepEqual(plan.actions.map((action) => action.action), [
    "noop_entity",
    "noop_entity",
    "noop_relation",
  ]);
  assert.equal(calls.some(([name]) => ["create", "update", "remove"].includes(name)), false);
});
