"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildPerson,
} = require("../src/modules/minisite-structured-data/person");
const {
  planKnowledgePilot,
} = require("../src/knowledge/pilot-planner");
const MAUREPAS_KNOWLEDGE_MANIFEST = require("../src/knowledge/pilots/maurepas.manifest");

test("canonical GEO chain keeps explicit Person bridge and Maurepas pilot compatible", () => {
  const node = buildPerson({
    member: {
      id: "anisia",
      name: "Anisia",
      role: "Conseillère voyage",
      knowledgeEntityId: "kg-anisia",
    },
    site: {
      slug: "maurepas",
      knowledgePeople: [],
    },
    publicOrigin: "https://agences.mondescale.com",
  });

  assert.equal(node.name, "Anisia");
  assert.equal(node.knowsAbout, undefined);
  assert.equal(MAUREPAS_KNOWLEDGE_MANIFEST.expertise.length, 0);

  const plan = planKnowledgePilot(MAUREPAS_KNOWLEDGE_MANIFEST, {
    existingEntities: [],
    existingRelations: [],
  });

  assert.equal(plan.mode, "dry-run");
  assert.equal(plan.destructive, false);
  assert.equal(plan.actions.some((action) => action.relationType === "expert_in"), false);
});
