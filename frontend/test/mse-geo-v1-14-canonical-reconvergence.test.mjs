import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

function source(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("clean team registry exposes structured members and controlled Knowledge Person link", () => {
  const registry = source("lib/website-builder/inspector-registry.js");

  assert.match(registry, /team:\s*\{/);
  assert.match(registry, /key:\s*"members"/);
  assert.match(registry, /key:\s*"knowledgeEntityId"/);
  assert.match(registry, /control:\s*"knowledge-person"/);
});

test("SectionInspector routes explicit Knowledge member links through KnowledgePersonSelect", () => {
  const inspector = source("components/website-builder/SectionInspector.js");

  assert.match(inspector, /KnowledgePersonSelect/);
  assert.match(inspector, /field\.key === "knowledgeEntityId"/);
  assert.match(inspector, /\.\.\.item/);
});

test("Person selector lists published Person entities only and has no matching inference", () => {
  const client = source("lib/website-builder/knowledge-person-selector.js");
  const select = source("components/website-builder/KnowledgePersonSelect.js");

  assert.match(client, /type:\s*"person"/);
  assert.match(client, /status:\s*"published"/);
  assert.match(select, /Aucune liaison Knowledge/);
  assert.match(select, /Liaison existante/);
  assert.doesNotMatch(`${client}\n${select}`, /autoMatch|generatedSlug|similarity|inferExpertise/i);
});
