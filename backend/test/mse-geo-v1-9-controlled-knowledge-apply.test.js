const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyKnowledgePilotPlan,
  validateApplyPlan,
  approvalTokenForPlan,
} = require("../src/knowledge/pilot-apply");

function basePlan() {
  return {
    mode: "dry-run",
    writes: false,
    destructive: false,
    manifestKey: "maurepas-v1",
    actions: [
      {
        action: "create_entity",
        ref: "agency:maurepas",
        entity: {
          type: "agency",
          slug: "mondescale-maurepas",
          title: "Mondescale Maurepas",
          status: "published",
          language: "fr",
          summary: "Agence de voyages Mondescale à Maurepas.",
        },
      },
      {
        action: "create_entity",
        ref: "person:anisia",
        entity: {
          type: "person",
          slug: "anisia-maurepas",
          title: "Anisia",
          status: "published",
          language: "fr",
          summary: "Conseillère de l'agence Mondescale Maurepas.",
        },
      },
      {
        action: "create_relation",
        sourceRef: "person:anisia",
        targetRef: "agency:maurepas",
        relationType: "works_at",
        sourceId: null,
        targetId: null,
      },
    ],
  };
}

test("controlled apply creates entities then resolves works_at explicitly", async () => {
  const plan = basePlan();
  const writes = [];

  const result = await applyKnowledgePilotPlan({
    plan,
    approvalToken: approvalTokenForPlan(plan),
    rebuildCurrentPlan: async () => structuredClone(plan),
    createEntity: async (entity) => {
      const id = entity.type === "agency" ? "agency-1" : "person-1";
      writes.push(["create_entity", id, entity.slug]);
      return { id };
    },
    updateEntity: async () => {
      throw new Error("updateEntity ne doit pas être appelé");
    },
    createRelation: async (sourceId, payload) => {
      writes.push([
        "create_relation",
        sourceId,
        payload.targetId,
        payload.relationType,
      ]);
      return { id: "relation-1" };
    },
  });

  assert.equal(result.mode, "apply");
  assert.equal(result.applied, true);
  assert.equal(result.destructive, false);
  assert.deepEqual(writes, [
    ["create_entity", "agency-1", "mondescale-maurepas"],
    ["create_entity", "person-1", "anisia-maurepas"],
    ["create_relation", "person-1", "agency-1", "works_at"],
  ]);
});

test("apply refuses stale dry-run when current plan changed", async () => {
  const plan = basePlan();
  const changed = structuredClone(plan);
  changed.actions[0].entity.title = "Titre modifié";

  let writes = 0;

  await assert.rejects(
    () =>
      applyKnowledgePilotPlan({
        plan,
        approvalToken: approvalTokenForPlan(plan),
        rebuildCurrentPlan: async () => changed,
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
    /a changé depuis le dry-run/
  );

  assert.equal(writes, 0);
});

test("destructive or unknown actions are refused before writes", () => {
  assert.throws(
    () => validateApplyPlan({
      ...basePlan(),
      destructive: true,
    }),
    /destructif/
  );

  assert.throws(
    () => validateApplyPlan({
      ...basePlan(),
      actions: [{ action: "delete_entity" }],
    }),
    /non autorisée/
  );
});

test("expert_in is refused unless explicitly authorized", async () => {
  const plan = {
    mode: "dry-run",
    destructive: false,
    manifestKey: "expertise-test",
    actions: [
      {
        action: "create_relation",
        sourceRef: "person:anisia",
        targetRef: "expertise:croisiere",
        relationType: "expert_in",
        sourceId: "person-1",
        targetId: "expertise-1",
      },
    ],
  };

  assert.throws(
    () => validateApplyPlan(plan),
    /autorisation explicite/
  );

  let relationWrites = 0;
  const result = await applyKnowledgePilotPlan({
    plan,
    approvalToken: approvalTokenForPlan(plan),
    allowExpertise: true,
    rebuildCurrentPlan: async () => structuredClone(plan),
    createEntity: async () => ({ id: "unused" }),
    updateEntity: async () => ({ id: "unused" }),
    createRelation: async () => {
      relationWrites += 1;
      return { id: "expert-rel-1" };
    },
  });

  assert.equal(relationWrites, 1);
  assert.equal(result.results[0].relationType, "expert_in");
});

test("noop plan performs zero writes", async () => {
  const plan = {
    mode: "dry-run",
    destructive: false,
    manifestKey: "maurepas-v1",
    actions: [
      {
        action: "noop_entity",
        ref: "agency:maurepas",
        entityId: "agency-1",
      },
      {
        action: "noop_entity",
        ref: "person:anisia",
        entityId: "person-1",
      },
      {
        action: "noop_relation",
        sourceRef: "person:anisia",
        targetRef: "agency:maurepas",
        relationType: "works_at",
      },
    ],
  };

  let writes = 0;

  const result = await applyKnowledgePilotPlan({
    plan,
    approvalToken: approvalTokenForPlan(plan),
    rebuildCurrentPlan: async () => structuredClone(plan),
    createEntity: async () => { writes += 1; },
    updateEntity: async () => { writes += 1; },
    createRelation: async () => { writes += 1; },
  });

  assert.equal(writes, 0);
  assert.equal(result.results.length, 3);
});
