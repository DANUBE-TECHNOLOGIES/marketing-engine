import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const tracker = fs.readFileSync(path.join(root, "app/ranking-grid/TerritorialActionTracker.js"), "utf8");

test("Wave 1 bulk tracking remains an explicit user action", () => {
  assert.match(tracker, /Suivre toute la Vague 1/);
  assert.match(tracker, /onClick=\{createWave1\}/);
  assert.match(tracker, /async function createWave1\(\)/);
  assert.doesNotMatch(tracker, /useEffect\([^]*createWave1\(/);
});

test("bulk tracking is limited to untracked Wave 1 recommendations", () => {
  assert.match(tracker, /const untrackedWave1 = wave1\.filter/);
  assert.match(tracker, /for \(const row of untrackedWave1\)/);
  assert.match(tracker, /territory\?\.actions\?\.find\(\(item\) => item\.code === row\.actionCode\)/);
  assert.doesNotMatch(tracker, /for \(const row of wave2\)/);
});

test("bulk tracking reuses idempotent AE POST and refreshes once after the batch", () => {
  assert.match(tracker, /async function postRecommendation\(territory, recommendation\)/);
  assert.match(tracker, /fetch\("\/api\/ranking-grid\/territorial-actions"/);
  assert.match(tracker, /await postRecommendation\(territory, recommendation\);/);
  assert.match(tracker, /The backend POST is idempotent, so a retry is safe\./);
});

test("bulk tracking does not invoke ranking providers or mutate rankings", () => {
  assert.doesNotMatch(tracker, /dataforseo|DataForSEO/i);
  assert.doesNotMatch(tracker, /rankings\/grid\/campaigns\/.*run/i);
  assert.doesNotMatch(tracker, /spatial-priorities\/action-plan/);
});
