import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/people/page.js", import.meta.url),
  "utf8"
);

test("Person network apply requires server preview and explicit approval", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/people-apply-preview/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /J’approuve explicitement/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /préflight complet/i);
});

test("Person network apply sends only approvalToken", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-people/);
  assert.match(page, /method:\s*"POST"/);
  assert.match(page, /JSON\.stringify\(\{\s*approvalToken:\s*applyPreview\.approvalToken/);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*plan:/s);
  assert.doesNotMatch(page, /allowExpertise/);
});

test("UI states ambiguous profiles and expertise stay out of apply", () => {
  assert.match(page, /cas ambigu/i);
  assert.match(page, /ne crée ni expertise/i);
  assert.match(page, /expert_in/);
  assert.match(page, /works_at/);
});
