import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "app/knowledge/geo/network/agency-knowledge/page.js"),
  "utf8"
);

test("bulk Agency Knowledge UI uses explicit preview then token-backed apply", () => {
  assert.match(page, /agency-knowledge-bulk-preview/);
  assert.match(page, /agency-knowledge-bulk-apply/);
  assert.match(page, /agencyKnowledgeIds:\s*bulkAgencyIds/);
  assert.match(page, /approvalToken:\s*bulkPreview\.approvalToken/);
  assert.match(page, /bulkPreview\?\.approvalToken/);
});

test("bulk selection is explicit and empty selection cannot prepare a network write", () => {
  assert.match(page, /Sélectionner toutes/);
  assert.match(page, /setBulkAgencyIds\(allAgencyIds\)/);
  assert.match(page, /!bulkAgencyIds\.length \|\| !bulkTargetId/);
  assert.match(page, /La sélection d’agences est obligatoire et explicite/);
});

test("bulk requires human approval and exact confirmation before apply", () => {
  assert.match(page, /bulkApproved/);
  assert.match(page, /J’approuve explicitement ce preview exact/);
  assert.match(page, /window\.confirm/);
  assert.match(page, /Appliquer le bulk approuvé/);
});

test("bulk only exposes recommends and features as creatable relations", () => {
  const bulkSection = page.slice(page.indexOf("Bulk réseau contrôlé"), page.indexOf("{(data.agencies || []).map((row) =>"));
  assert.match(bulkSection, /value="recommends"/);
  assert.match(bulkSection, /value="features"/);
  assert.doesNotMatch(bulkSection, /value="available_in"/);
});
