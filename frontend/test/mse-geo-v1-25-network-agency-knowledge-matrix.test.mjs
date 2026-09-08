import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/knowledge/geo/network/agency-knowledge/page.js", import.meta.url), "utf8");
const layout = fs.readFileSync(new URL("../app/knowledge/geo/network/layout.js", import.meta.url), "utf8");

test("Agency Knowledge UI uses exact matrix/write endpoints and exact ids", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/agency-knowledge-matrix/);
  assert.match(page, /\/api\/knowledge\/geo\/network\/agency-knowledge-links/);
  assert.match(page, /agencyKnowledgeId:\s*row\.agency\.id/);
  assert.match(page, /targetKnowledgeId/);
  assert.match(page, /relationType:\s*type/);
});

test("UI offers only recommends/features creation and requires explicit confirmation", () => {
  assert.match(page, /window\.confirm/);
  assert.match(page, /Confirmer explicitement/);
  assert.match(page, /option value="recommends"/);
  assert.match(page, /option value="features"/);
  assert.doesNotMatch(page, /option value="available_in"/);
});

test("UI states anti-inference contract and shared navigation exposes matrix", () => {
  assert.match(page, /Aucune suggestion/);
  assert.match(page, /avis/);
  assert.match(page, /ranking/);
  assert.match(page, /LLM/);
  assert.match(layout, /\/knowledge\/geo\/network\/agency-knowledge/);
  assert.match(layout, /Destinations & thèmes/);
});
