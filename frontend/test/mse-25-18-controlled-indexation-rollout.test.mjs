import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.18 rollout screen is internal and linked from the cockpit", () => {
  const cockpitPage = read("app/indexation/page.js");
  const rolloutPage = read("app/indexation/rollout/page.js");

  assert.match(cockpitPage, /\/indexation\/rollout/);
  assert.match(rolloutPage, /robots:/);
  assert.match(rolloutPage, /index:\s*false/);
  assert.match(rolloutPage, /follow:\s*false/);
  assert.match(rolloutPage, /RolloutPageClient/);
});

test("MSE-25.18 rollout only orchestrates preflight and prepare", () => {
  const pageClient = read("app/indexation/rollout/RolloutPageClient.js");
  const planner = read("app/indexation/IndexationRolloutPlanner.js");

  assert.match(pageClient, /indexationApi\.preflight/);
  assert.match(pageClient, /indexationApi\.prepare/);
  assert.doesNotMatch(pageClient, /indexationApi\.approve/);
  assert.doesNotMatch(pageClient, /indexationApi\.submit/);
  assert.doesNotMatch(planner, /onApprove/);
  assert.doesNotMatch(planner, /onSubmit/);
  assert.doesNotMatch(planner, /indexationApi\.approve/);
  assert.doesNotMatch(planner, /indexationApi\.submit/);
});

test("MSE-25.18 rollout executes selected operations sequentially", () => {
  const planner = read("app/indexation/IndexationRolloutPlanner.js");

  assert.match(planner, /for \(const row of selectedRows\)/);
  assert.match(planner, /await onPreflight\(row\.site\)/);
  assert.match(planner, /for \(const row of selectedPreflightReady\)/);
  assert.match(planner, /await onPrepare\(row\.site\)/);
});

test("MSE-25.18 only selects sites eligible for a fresh cycle", () => {
  const planner = read("app/indexation/IndexationRolloutPlanner.js");

  assert.match(planner, /readyToSubmit === true/);
  assert.match(planner, /!run \|\| run\.status === ["']failed["']/);
  assert.match(planner, /preflights\[row\.site\.siteSlug\]\?\.ready === true/);
});

test("MSE-25.18 clears the batch selection after preparation", () => {
  const planner = read("app/indexation/IndexationRolloutPlanner.js");
  const prepareBlock = planner.match(/const prepareSelected = async \(\) => \{([\s\S]*?)\n  \};/);

  assert.ok(prepareBlock, "prepareSelected doit exister");
  assert.match(prepareBlock[1], /setSelected\(\[\]\)/);
  assert.match(planner, /Aucun bouton de cette zone n’approuve ni ne soumet/);
});
