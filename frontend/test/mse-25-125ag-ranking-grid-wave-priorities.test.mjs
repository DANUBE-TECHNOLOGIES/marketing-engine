import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("cockpit surfaces Wave 1 execution summary", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /Vague 1 — actions à lancer maintenant/);
  assert.match(tracker, /Priorité V1/);
  assert.match(tracker, /2 leviers par territoire critique/);
});

test("Wave 1 and Wave 2 recommendations are marked from executionPlan", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /plan\?\.executionPlan/);
  assert.match(tracker, /wave1Keys/);
  assert.match(tracker, /wave2Keys/);
  assert.match(tracker, /isWave1/);
  assert.match(tracker, /isWave2/);
});

test("Wave prioritization never auto-creates tracked actions", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /onClick=\{\(\) => create\(territory, recommendation\)\}/);
  assert.match(tracker, /onClick=\{createWave1\}/);
  assert.doesNotMatch(tracker, /useEffect\([^]*(?:create\(|createWave1\()/);
  assert.match(tracker, /création uniquement après action explicite/);
});

test("Wave 1 card highlights expected low-effort action labels", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /service_area_relevance/);
  assert.match(tracker, /Pertinence zone de service/);
  assert.match(tracker, /internal_linking/);
  assert.match(tracker, /Maillage interne local/);
});
