const test = require("node:test");
const assert = require("node:assert/strict");
const service = require("../src/knowledge/network-agency-knowledge.service");

function fakePrisma({ agencies = [], targets = [], byId = {} } = {}) {
  return { knowledgeEntity: {
    async findMany({ where }) {
      if (where?.type === "agency") return agencies;
      if (where?.type?.in) return targets;
      return [];
    },
    async findUnique({ where }) { return byId[where.id] || null; },
  } };
}

test("matrix reads recommends features and available_in but creates only recommends/features", async () => {
  const result = await service.matrix({ prismaClient: fakePrisma({
    agencies: [{ id:"a1", slug:"mondescale-maurepas", title:"Maurepas", language:"fr", outgoingRelations:[
      { id:"r1", relationType:"available_in", targetId:"d1", target:{ id:"d1", type:"destination", slug:"sicile", title:"Sicile", status:"published", language:"fr" } },
    ] }],
    targets: [{ id:"d1", type:"destination", slug:"sicile", title:"Sicile", language:"fr" }],
  }) });
  assert.deepEqual(result.creatableRelationTypes.sort(), ["features","recommends"]);
  assert.equal(result.agencies[0].relations[0].relationType, "available_in");
  assert.equal(result.inference, false);
});

test("available_in cannot be created", async () => {
  let writes = 0;
  await assert.rejects(() => service.addExplicitRelation({
    agencyKnowledgeId:"a1", targetKnowledgeId:"d1", relationType:"available_in",
    prismaClient: fakePrisma(), createRelation: async () => { writes += 1; },
  }), /non créable/);
  assert.equal(writes, 0);
});

test("exact existing relation is a noop", async () => {
  let writes = 0;
  const result = await service.addExplicitRelation({
    agencyKnowledgeId:"a1", targetKnowledgeId:"d1", relationType:"recommends",
    prismaClient: fakePrisma({ byId: {
      a1:{ id:"a1", type:"agency", status:"published", outgoingRelations:[{ id:"r1", relationType:"recommends", targetId:"d1" }] },
      d1:{ id:"d1", type:"destination", status:"published" },
    } }),
    createRelation: async () => { writes += 1; },
  });
  assert.equal(result.noop, true);
  assert.equal(writes, 0);
});

test("creates only the explicitly selected exact relation", async () => {
  const calls = [];
  const result = await service.addExplicitRelation({
    agencyKnowledgeId:"a1", targetKnowledgeId:"t1", relationType:"features",
    prismaClient: fakePrisma({ byId: {
      a1:{ id:"a1", type:"agency", status:"published", outgoingRelations:[] },
      t1:{ id:"t1", type:"travel_theme", status:"published" },
    } }),
    createRelation: async (sourceId, payload) => { calls.push([sourceId,payload]); return { id:"r2" }; },
  });
  assert.equal(result.created, true);
  assert.deepEqual(calls, [["a1", { targetId:"t1", relationType:"features" }]]);
});

test("rejects unpublished Agency or unsupported target before writes", async () => {
  let writes = 0;
  await assert.rejects(() => service.addExplicitRelation({
    agencyKnowledgeId:"a1", targetKnowledgeId:"x1", relationType:"recommends",
    prismaClient: fakePrisma({ byId: {
      a1:{ id:"a1", type:"agency", status:"draft", outgoingRelations:[] },
      x1:{ id:"x1", type:"article", status:"published" },
    } }),
    createRelation: async () => { writes += 1; },
  }), /Agency Knowledge publiée introuvable/);
  assert.equal(writes, 0);
});
