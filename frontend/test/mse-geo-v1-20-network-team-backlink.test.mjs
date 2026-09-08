import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/backlinks/page.js", import.meta.url),
  "utf8"
);

test("team backlink UI requires server preview and explicit approval", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/team-backlink-preview/);
  assert.match(page, /type="checkbox"/);
  assert.match(page, /J’approuve explicitement/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /préflight complet/i);
});

test("team backlink apply sends only approvalToken", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-team-backlinks/);
  assert.match(page, /method:\s*"POST"/);
  assert.match(page, /JSON\.stringify\(\{\s*approvalToken:\s*preview\.approvalToken/);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*content:/s);
  assert.doesNotMatch(page, /body:\s*JSON\.stringify\(\{[^}]*knowledgeEntityId:/s);
});

test("team backlink UI states patch is knowledgeEntityId-only and preserves content", () => {
  assert.match(page, /knowledgeEntityId/);
  assert.match(page, /Aucun autre champ n’est modifié/i);
  assert.match(page, /conserve tous les champs existants/i);
  assert.match(page, /cas ambigus ou non canoniques restent inchangés/i);
});
