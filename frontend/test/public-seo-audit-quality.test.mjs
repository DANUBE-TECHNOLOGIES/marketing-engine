import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const audit = await readFile(
  new URL("../scripts/audit-public-seo.mjs", import.meta.url),
  "utf8"
);

test("public SEO audit detects thin visible content", () => {
  assert.match(audit, /minimum-words/);
  assert.match(audit, /visibleMainText/);
  assert.match(audit, /wordCount/);
  assert.match(audit, /contenu visible léger/);
  assert.match(audit, /PAGES A ENRICHIR EN PRIORITE/);
});

test("public SEO audit verifies the primary local signal", () => {
  assert.match(audit, /agencyLocality/);
  assert.match(audit, /containsCity/);
  assert.match(audit, /ville principale absente du title/);
  assert.match(audit, /ville principale absente du H1/);
});

test("public SEO audit verifies structured NAP consistency", () => {
  assert.match(audit, /agencyHasNap/);
  assert.match(audit, /NAP structuré incomplet/);
  assert.match(audit, /addressLocality/);
  assert.match(audit, /postalCode/);
  assert.match(audit, /telephone/);
});

test("destination and inspiration detail pages are not forced into local title stuffing", () => {
  assert.match(audit, /destination-detail/);
  assert.match(audit, /inspiration-detail/);
  assert.match(audit, /localSignalRequired/);
});
