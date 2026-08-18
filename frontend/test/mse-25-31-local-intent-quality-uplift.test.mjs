import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const repoRoot = path.resolve(frontendRoot, "..");
const mapping = fs.readFileSync(path.join(repoRoot, "backend/src/modules/minisite-structured-data/local-intent-target-mapping.js"), "utf8");

test("MSE-25.31 scores quality of concrete local secondary intent targets", () => {
  assert.match(mapping, /function targetQuality/);
  assert.match(mapping, /titleHasCity/);
  assert.match(mapping, /titleHasIntent/);
  assert.match(mapping, /bodyHasCity/);
  assert.match(mapping, /bodyHasIntent/);
  assert.match(mapping, /bodyWordCount >= 80/);
  assert.match(mapping, /targetQualityScore/);
  assert.match(mapping, /targetQualityStatus/);
  assert.match(mapping, /bestTarget/);
});

test("MSE-25.31 keeps secondary target quality warnings consultative", () => {
  assert.match(mapping, /code: "local-secondary-intent-target-quality-weak"/);
  assert.match(mapping, /severity: intent\.targetQualityScore < 60 \? "medium" : "low"/);
  assert.doesNotMatch(mapping, /severity: intent\.targetQualityScore < 60 \? "high"/);
  assert.match(mapping, /intent\.key !== "agency"/);
});

test("MSE-25.31 target selection is deterministic", () => {
  assert.match(mapping, /sort\(\(left, right\) => right\.quality\.score - left\.quality\.score \|\| left\.slug\.localeCompare\(right\.slug, "fr"\)\)/);
  assert.match(mapping, /strongSecondaryTargetCount/);
  assert.match(mapping, /weakSecondaryTargets/);
  assert.match(mapping, /improvableSecondaryTargets/);
});
