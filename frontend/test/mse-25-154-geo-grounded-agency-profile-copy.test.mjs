import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../components/public-site/renderers/AgencyV2Renderer.js", import.meta.url), "utf8");

test("MSE-25.154 default agency profile copy stays on published identity/contact facts", () => {
  assert.match(renderer, /coordonnées, horaires et informations publiques/);
  assert.match(renderer, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
  assert.match(renderer, /secteurs de/);
});

test("MSE-25.154 default agency profile does not auto-claim services or lifecycle support", () => {
  assert.doesNotMatch(renderer, /séjours, circuits, croisières et voyages sur mesure/);
  assert.doesNotMatch(renderer, /avant, pendant et après/);
  assert.doesNotMatch(renderer, /vous conseille/);
});
