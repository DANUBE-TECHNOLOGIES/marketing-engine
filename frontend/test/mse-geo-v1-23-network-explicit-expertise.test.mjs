import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/expertise/page.js", import.meta.url),
  "utf8"
);
const layout = fs.readFileSync(
  new URL("../app/knowledge/geo/network/layout.js", import.meta.url),
  "utf8"
);

test("expertise dashboard uses the explicit matrix and exact write endpoint", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/expertise-matrix/);
  assert.match(page, /\/api\/knowledge\/geo\/network\/expertise-links/);
  assert.match(page, /method:\s*["']POST["']/);
  assert.match(page, /personId:\s*person\.id/);
  assert.match(page, /expertiseId/);
});

test("expertise dashboard requires human confirmation and states anti-inference contract", () => {
  assert.match(page, /window\.confirm/);
  assert.match(page, /Confirmer explicitement/);
  assert.match(page, /Aucune expertise n’est déduite/i);
  assert.match(page, /avis/);
  assert.match(page, /ranking/);
  assert.match(page, /texte libre/);
});

test("network navigation exposes expertise matrix", () => {
  assert.match(layout, /\/knowledge\/geo\/network\/expertise/);
  assert.match(layout, />Expertises</);
});
