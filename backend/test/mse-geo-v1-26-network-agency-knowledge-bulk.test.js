const test = require("node:test");
const assert = require("node:assert/strict");

const bulk = require("../src/knowledge/network-agency-knowledge-bulk.service");

function target() {
  return {
    id: "theme-1",
    type: "travel_theme",
    slug: "circuits-accompagnes",
    title: "Circuits accompagnés",
    status: "published",
    language: "fr",
  };
}

function agency(id, relations = [], overrides = {}) {
  return {
    id,
    type: "agency",
    slug: `mondescale-${id}`,
    title: `Agence ${id}`,
    status: "published",
    language: "fr",
    outgoingRelations: relations,
    ...overrides,
  };
}

function fakePrisma({ agencies, targetEntity = target() }) {
  return {
    knowledgeEntity: {
      async findUnique({ where }) {
        if (where.id === targetEntity.id) return targetEntity;
        return agencies.find((item) => item.id === where.id) || null;
      },
      async findMany({ where }) {
        const ids = where?.id?.in || [];
        return agencies.filter((item) => ids.includes(item.id));
      },
    },
  };
}

test("bulk input requires an explicit non-empty Agency selection and creatable relation", () => {
  assert.throws(
    () => bulk.validateBulkInput({ agencyKnowledgeIds: [], targetKnowledgeId: "theme-1", relationType: "recommends" }),
    /explicite et non vide/
  );
  assert.throws(
    () => bulk.validateBulkInput({ agencyKnowledgeIds: ["a1"], targetKnowledgeId: "theme-1", relationType: "available_in" }),
    /non créable/
  );
});

test("preview deduplicates and sorts Agency ids deterministically", async () => {
  const prismaClient = fakePrisma({ agencies: [agency("b"), agency("a")] });
  const result = await bulk.preview({
    agencyKnowledgeIds: ["b", "a", "b"],
    targetKnowledgeId: "theme-1",
    relationType: "features",
    prismaClient,
  });

  assert.deepEqual(result.report.agencies.map((item) => item.id), ["a", "b"]);
  assert.equal(result.report.summary.createCount, 2);
  assert.equal(result.report.summary.noopCount, 0);
  assert.match(result.approvalToken, /^[a-f0-9]{64}$/);
});

test("stale approval blocks the whole bulk before writes", async () => {
  let currentAgencies = [agency("a"), agency("b")];
  const prismaClient = {
    knowledgeEntity: {
      async findUnique({ where }) {
        if (where.id === "theme-1") return target();
        return currentAgencies.find((item) => item.id === where.id) || null;
      },
      async findMany({ where }) {
        return currentAgencies.filter((item) => (where?.id?.in || []).includes(item.id));
      },
    },
  };
  const input = {
    agencyKnowledgeIds: ["a", "b"],
    targetKnowledgeId: "theme-1",
    relationType: "recommends",
    prismaClient,
  };
  const prepared = await bulk.preview(input);
  currentAgencies = [
    agency("a", [{ id: "rel-a", relationType: "recommends", targetId: "theme-1" }]),
    agency("b"),
  ];

  let writes = 0;
  await assert.rejects(
    () => bulk.apply({
      ...input,
      approvalToken: prepared.approvalToken,
      createRelation: async () => { writes += 1; },
    }),
    /ne correspond plus/
  );
  assert.equal(writes, 0);
});

test("invalid selected Agency blocks all writes during preflight", async () => {
  const prismaClient = fakePrisma({
    agencies: [agency("a"), agency("b", [], { status: "draft" })],
  });
  let writes = 0;

  await assert.rejects(
    () => bulk.preview({
      agencyKnowledgeIds: ["a", "b"],
      targetKnowledgeId: "theme-1",
      relationType: "features",
      prismaClient,
    }),
    /non publiée ou de mauvais type/
  );
  assert.equal(writes, 0);
});

test("apply creates only missing exact relations and keeps existing ones as noop", async () => {
  const prismaClient = fakePrisma({
    agencies: [
      agency("a", [{ id: "rel-a", relationType: "features", targetId: "theme-1" }]),
      agency("b"),
    ],
  });
  const input = {
    agencyKnowledgeIds: ["b", "a"],
    targetKnowledgeId: "theme-1",
    relationType: "features",
    prismaClient,
  };
  const prepared = await bulk.preview(input);
  const writes = [];
  const result = await bulk.apply({
    ...input,
    approvalToken: prepared.approvalToken,
    createRelation: async (sourceId, payload) => {
      writes.push([sourceId, payload.targetId, payload.relationType]);
      return { id: `created-${sourceId}` };
    },
  });

  assert.deepEqual(writes, [["b", "theme-1", "features"]]);
  assert.equal(result.summary.createdCount, 1);
  assert.equal(result.summary.noopCount, 1);
  assert.deepEqual(result.results, [
    { agencyKnowledgeId: "a", action: "noop", relationId: "rel-a" },
    { agencyKnowledgeId: "b", action: "created", relationId: "created-b" },
  ]);
});
