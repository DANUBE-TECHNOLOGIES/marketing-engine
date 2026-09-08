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

test("coverage dashboard consumes one read-only coverage endpoint", () => {
  assert.match(page, /agency-knowledge-coverage/);
  assert.match(page, /cache:\s*"no-store"/);
  assert.doesNotMatch(page, /method:\s*"POST"/);
  assert.doesNotMatch(page, /method:\s*"DELETE"/);
});

test("coverage dashboard exposes gaps and explicit relation categories", () => {
  assert.match(page, /coverageRate/);
  assert.match(page, /recommends/);
  assert.match(page, /features/);
  assert.match(page, /available_in seul/);
  assert.match(page, /Sans relation/);
  assert.match(page, /missingAgencyKnowledgeIds/);
});

test("coverage action only transfers exact missing ids to the controlled bulk page", () => {
  assert.match(page, /bulkAgencies:\s*item\.missingAgencyKnowledgeIds\.join/);
  assert.match(page, /bulkTarget:\s*item\.target\.id/);
  assert.match(page, /bulkRelation:\s*"recommends"/);
  assert.match(page, /Préparer les agences manquantes dans le bulk/);
  assert.doesNotMatch(page, /agency-knowledge-bulk-apply/);
});

test("network navigation exposes coverage as a sibling view", () => {
  assert.match(layout, /\/knowledge\/geo\/network\/coverage/);
  assert.match(layout, /Couverture GEO/);
});
