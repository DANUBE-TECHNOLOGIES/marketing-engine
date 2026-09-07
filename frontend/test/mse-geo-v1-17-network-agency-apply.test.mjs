import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/page.js", import.meta.url),
  "utf8"
);

test("network Agency apply requires server preview and explicit approval", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-preview/);
  assert.match(page, /setApproved\(false\)/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /J’approuve explicitement/);
  assert.match(page, /window\.confirm/);
});

test("network Agency apply sends only the approval token", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-agencies/);
  assert.match(page, /method:\s*"POST"/);
  assert.match(page, /JSON\.stringify\(\{\s*approvalToken:\s*applyPreview\.approvalToken/);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*plan:/s);
  assert.doesNotMatch(page, /allowExpertise/);
});

test("network UI states clearly that apply is Agency-only", () => {
  assert.match(page, /limitée aux entités Agency/i);
  assert.match(page, /ne crée ni conseiller, ni expertise, ni relation/i);
  assert.match(page, /agences bloquées sont restées inchangées/i);
});
