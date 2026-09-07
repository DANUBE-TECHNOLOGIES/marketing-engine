"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  KNOWLEDGE_TYPES,
} = require("../src/knowledge/knowledge.constants");
const knowledgeValidation = require("../src/knowledge/knowledge.validation");
const relationValidation = require("../src/knowledge/knowledge-relation.validation");

test("MSE-GEO V1.3 autorise agency person et expertise comme entités Knowledge", () => {
  for (const type of ["agency", "person", "expertise"]) {
    assert.equal(KNOWLEDGE_TYPES.includes(type), true, type);
    const payload = knowledgeValidation.validateCreatePayload({
      type,
      title: `Test ${type}`,
      slug: `test-${type}`,
      status: "draft",
      language: "fr",
      metadata: { source: "explicit" },
    });
    assert.equal(payload.type, type);
    assert.deepEqual(payload.metadata, { source: "explicit" });
  }
});

test("MSE-GEO V1.3 conserve les types Knowledge historiques", () => {
  for (const type of ["destination", "city", "hotel", "cruise", "travel_theme"]) {
    const payload = knowledgeValidation.validateCreatePayload({
      type,
      title: `Historique ${type}`,
    });
    assert.equal(payload.type, type);
  }
});

test("MSE-GEO V1.3 accepte uniquement des relations d'expertise explicites", () => {
  const worksAt = relationValidation.validateCreatePayload({
    targetId: "agency-maurepas",
    relationType: "works_at",
    metadata: { source: "manual" },
  });
  assert.equal(worksAt.relationType, "works_at");

  const expertIn = relationValidation.validateCreatePayload({
    targetId: "expertise-croisieres",
    relationType: "expert_in",
    metadata: { source: "manual" },
  });
  assert.equal(expertIn.relationType, "expert_in");

  assert.throws(
    () => relationValidation.validateCreatePayload({
      targetId: "expertise-maldives",
      relationType: "inferred_expert_in",
    }),
    /Type de relation non autorisé/
  );
});

test("MSE-GEO V1.3 conserve served_by pour la zone de chalandise vérifiée", () => {
  const relation = relationValidation.validateCreatePayload({
    targetId: "agency-maurepas",
    relationType: "served_by",
  });
  assert.equal(relation.relationType, "served_by");
});

test("MSE-GEO V1.3 n'ouvre pas la taxonomie à des types arbitraires", () => {
  assert.throws(
    () => knowledgeValidation.validateCreatePayload({
      type: "advisor_inferred",
      title: "Type non autorisé",
    }),
    /Type Knowledge non autorisé/
  );
});
