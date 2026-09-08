import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const page = fs.readFileSync(
  path.join(process.cwd(), "app/knowledge/geo/network/coverage/page.js"),
  "utf8"
);
const layout = fs.readFileSync(
  path.join(process.cwd(), "app/knowledge/geo/network/layout.js"),
  "utf8"
);

test("coverage dashboard is read-only and uses exact GET endpoint", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/coverage/);
  assert.match(page, /cache:\s*"no-store"/);
  assert.doesNotMatch(page, /method:\s*"POST"/);
  assert.doesNotMatch(page, /approvalToken/);
});

test("coverage dashboard surfaces explicit gaps without auto suggestions", () => {
  assert.match(page, /Agences sans recommends\/features/);
  assert.match(page, /Conseillers sans expertise/);
  assert.match(page, /Conseillers sans agence/);
  assert.match(page, /Une absence est une lacune éditoriale à valider/);
  assert.doesNotMatch(page, /suggestion automatique/i);
});

test("coverage dashboard links to existing controlled correction matrices", () => {
  assert.match(page, /\/knowledge\/geo\/network\/agency-knowledge/);
  assert.match(page, /\/knowledge\/geo\/network\/expertise/);
  assert.match(layout, /\/knowledge\/geo\/network\/coverage/);
  assert.match(layout, /Couverture GEO/);
});
