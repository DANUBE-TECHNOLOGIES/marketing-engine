import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);

function source(path) {
  return fs.readFileSync(new URL(path, root), "utf8");
}

test("shared GEO admin options expose agency person expertise and explicit relation types", () => {
  const options = source("lib/knowledge/geo-admin-options.js");

  for (const value of ["agency", "person", "expertise", "works_at", "expert_in"]) {
    assert.match(options, new RegExp(`\\[\\"${value}\\"`));
  }
});

test("Knowledge list and detail consume shared GEO entity types", () => {
  const list = source("app/knowledge/page.js");
  const detail = source("app/knowledge/[id]/page.js");

  assert.match(list, /GEO_KNOWLEDGE_TYPES/);
  assert.match(detail, /GEO_KNOWLEDGE_TYPES/);
  assert.match(list, /\.\.\.GEO_KNOWLEDGE_TYPES/);
  assert.match(detail, /\.\.\.GEO_KNOWLEDGE_TYPES/);
});

test("RelationManager consumes explicit GEO relation types without inference helpers", () => {
  const relations = source("app/knowledge/[id]/RelationManager.js");

  assert.match(relations, /GEO_KNOWLEDGE_RELATION_TYPES/);
  assert.match(relations, /\.\.\.GEO_KNOWLEDGE_RELATION_TYPES/);
  assert.doesNotMatch(relations, /autoMatch|inferExpertise|guessRelation|similarity/i);
});
