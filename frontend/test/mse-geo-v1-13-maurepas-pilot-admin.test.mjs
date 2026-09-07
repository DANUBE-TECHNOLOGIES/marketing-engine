import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../app/knowledge/pilots/maurepas/page.js", import.meta.url),
  "utf8"
);

const knowledgeStudioSource = fs.readFileSync(
  new URL("../app/knowledge/page.js", import.meta.url),
  "utf8"
);

test("pilot admin uses preview and apply endpoints only", () => {
  assert.match(source, /\/api\/knowledge\/pilots\/maurepas\/preview/);
  assert.match(source, /\/api\/knowledge\/pilots\/maurepas\/apply/);
  assert.doesNotMatch(source, /method:\s*["']DELETE["']/i);
});

test("apply request sends only approvalToken and never the plan", () => {
  assert.match(source, /body:\s*JSON\.stringify\(\{\s*approvalToken:\s*preview\.approvalToken,?\s*\}\)/s);
  assert.doesNotMatch(source, /body:\s*JSON\.stringify\(\{[^}]*plan\s*:/s);
});

test("explicit approval and confirmation are mandatory before apply", () => {
  assert.match(source, /type="checkbox"/);
  assert.match(source, /checked=\{approved\}/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /disabled=\{!approved \|\| loading \|\| applying \|\| actionableActions\.length === 0\}/);
});

test("frontend does not expose expertise override or inference helpers", () => {
  assert.doesNotMatch(source, /allowExpertise/);
  assert.doesNotMatch(source, /autoMatch|inferExpertise|similarity|guessRelation/i);
});

test("Knowledge Studio exposes navigation to Maurepas pilot without triggering apply", () => {
  assert.match(knowledgeStudioSource, /href="\/knowledge\/pilots\/maurepas"/);
  assert.match(knowledgeStudioSource, /Pilote GEO Maurepas/);
  assert.doesNotMatch(knowledgeStudioSource, /\/api\/knowledge\/pilots\/maurepas\/apply/);
});
