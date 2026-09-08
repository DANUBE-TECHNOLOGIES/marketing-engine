const test = require("node:test");
const assert = require("node:assert/strict");

const service = require("../src/knowledge/network-expertise.service");

function fakePrisma({ people = [], expertise = [], byId = {} } = {}) {
  return {
    knowledgeEntity: {
      async findMany({ where }) {
        if (where?.type === "person") return people;
        if (where?.type === "expertise") return expertise;
        return [];
      },
      async findUnique({ where }) {
        return byId[where.id] || null;
      },
    },
  };
}

test("matrix exposes only explicit works_at and expert_in relationships", async () => {
  const prismaClient = fakePrisma({
    people: [
      {
        id: "person-1",
        slug: "anisia-maurepas",
        title: "Anisia",
        language: "fr",
        outgoingRelations: [
          {
            id: "works-1",
            relationType: "works_at",
            targetId: "agency-1",
            target: { id: "agency-1", type: "agency", slug: "mondescale-maurepas", title: "Mondescale Maurepas", status: "published", language: "fr" },
          },
          {
            id: "expert-1",
            relationType: "expert_in",
            targetId: "exp-1",
            target: { id: "exp-1", type: "expertise", slug: "croisieres", title: "Croisières", status: "published", language: "fr" },
          },
        ],
      },
    ],
    expertise: [{ id: "exp-1", slug: "croisieres", title: "Croisières", language: "fr" }],
  });

  const result = await service.matrix({ prismaClient });
  assert.equal(result.inference, false);
  assert.equal(result.providerCall, false);
  assert.equal(result.people[0].agency.id, "agency-1");
  assert.deepEqual(result.people[0].expertises.map((item) => item.id), ["exp-1"]);
  assert.equal(result.summary.explicitExpertInCount, 1);
});

test("addExplicitExpertise is idempotent when expert_in already exists", async () => {
  let writes = 0;
  const person = {
    id: "person-1",
    type: "person",
    status: "published",
    outgoingRelations: [
      { relationType: "works_at", targetId: "agency-1", target: { id: "agency-1", type: "agency", status: "published" } },
      { id: "rel-1", relationType: "expert_in", targetId: "exp-1", target: { id: "exp-1", type: "expertise", status: "published" } },
    ],
  };
  const prismaClient = fakePrisma({
    byId: {
      "person-1": person,
      "exp-1": { id: "exp-1", type: "expertise", status: "published" },
    },
  });

  const result = await service.addExplicitExpertise({
    personId: "person-1",
    expertiseId: "exp-1",
    prismaClient,
    createRelation: async () => { writes += 1; },
  });

  assert.equal(result.noop, true);
  assert.equal(writes, 0);
});

test("addExplicitExpertise creates only exact expert_in after published works_at validation", async () => {
  const calls = [];
  const prismaClient = fakePrisma({
    byId: {
      "person-1": {
        id: "person-1",
        type: "person",
        status: "published",
        outgoingRelations: [
          { relationType: "works_at", targetId: "agency-1", target: { id: "agency-1", type: "agency", status: "published" } },
        ],
      },
      "exp-2": { id: "exp-2", type: "expertise", status: "published" },
    },
  });

  const result = await service.addExplicitExpertise({
    personId: "person-1",
    expertiseId: "exp-2",
    prismaClient,
    createRelation: async (sourceId, payload) => {
      calls.push([sourceId, payload]);
      return { id: "rel-2" };
    },
  });

  assert.equal(result.created, true);
  assert.deepEqual(calls, [["person-1", { targetId: "exp-2", relationType: "expert_in" }]]);
});

test("addExplicitExpertise blocks a Person without published works_at", async () => {
  let writes = 0;
  const prismaClient = fakePrisma({
    byId: {
      "person-1": { id: "person-1", type: "person", status: "published", outgoingRelations: [] },
      "exp-1": { id: "exp-1", type: "expertise", status: "published" },
    },
  });

  await assert.rejects(
    () => service.addExplicitExpertise({
      personId: "person-1",
      expertiseId: "exp-1",
      prismaClient,
      createRelation: async () => { writes += 1; },
    }),
    /works_at/
  );
  assert.equal(writes, 0);
});

test("addExplicitExpertise rejects non-published or wrong-type expertise", async () => {
  let writes = 0;
  const prismaClient = fakePrisma({
    byId: {
      "person-1": {
        id: "person-1",
        type: "person",
        status: "published",
        outgoingRelations: [{ relationType: "works_at", target: { id: "agency-1", type: "agency", status: "published" } }],
      },
      "exp-1": { id: "exp-1", type: "destination", status: "published" },
    },
  });

  await assert.rejects(
    () => service.addExplicitExpertise({
      personId: "person-1",
      expertiseId: "exp-1",
      prismaClient,
      createRelation: async () => { writes += 1; },
    }),
    /Expertise Knowledge publiée introuvable/
  );
  assert.equal(writes, 0);
});
