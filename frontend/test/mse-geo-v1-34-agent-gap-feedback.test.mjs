import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(process.cwd());
const pagePath = path.join(root, "app/knowledge/geo/network/gaps/page.js");
const layoutPath = path.join(root, "app/knowledge/geo/network/layout.js");

const page = fs.readFileSync(pagePath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");

test("Knowledge gaps page calls only the internal Marketing Engine API", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/agent-gaps\?limit=100/);
  assert.doesNotMatch(page, /x-knowledge-admin-token/i);
  assert.doesNotMatch(page, /MONDESCALE_AI_/);
  assert.doesNotMatch(page, /\/api\/knowledge\/gaps/);
});

test("Knowledge gaps page is explicitly observational and read-only", () => {
  assert.match(page, /jamais une suggestion automatique/i);
  assert.match(page, /ne crée ni relation, ni expertise, ni destination/i);
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
});

test("network navigation exposes the gaps view", () => {
  assert.match(layout, /\/knowledge\/geo\/network\/gaps/);
  assert.match(layout, /Questions non couvertes/);
});
