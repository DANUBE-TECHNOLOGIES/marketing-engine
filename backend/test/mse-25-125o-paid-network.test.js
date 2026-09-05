"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function resolveScriptPath() {
  const candidates = [
    path.resolve(__dirname, "../../scripts/mse-25-125o-paid-network.sh"),
    path.resolve(process.cwd(), "../scripts/mse-25-125o-paid-network.sh"),
    "/scripts/mse-25-125o-paid-network.sh",
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

const scriptPath = resolveScriptPath();
const script = scriptPath ? fs.readFileSync(scriptPath, "utf8") : null;

function requireHostScript(t) {
  if (script) return true;
  t.skip("host-level scripts directory is not mounted in the backend container; validate shell script on host");
  return false;
}

test("network executor requires explicit unique campaigns, exact ack and global cost cap", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /MSE_25_125O_CAMPAIGN_IDS/);
  assert.match(script, /RUN-NETWORK-RANKING-GRID-CAMPAIGNS/);
  assert.match(script, /MSE_25_125O_MAX_TOTAL_COST_USD:-0\.35/);
  assert.match(script, /new Set\(ids\)\.size !== ids\.length/);
  assert.match(script, /paid-plan\?campaignIds=\$NORMALIZED_IDS/);
  assert.match(script, /global estimated cost .* exceeds max/);
});

test("network executor never enables provider and delegates every paid campaign to 125M", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /this script will not enable it/);
  assert.doesNotMatch(script, /export RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(script, /sed -i .*RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.match(script, /MSE_25_125M_PAID_ACK="RUN-SINGLE-RANKING-GRID-CAMPAIGN"/);
  assert.match(script, /bash "\$SINGLE_SCRIPT"/);
  assert.match(script, /MSE_25_125O_MAX_CAMPAIGN_COST_USD:-0\.05/);
});

test("network executor is restart-safe and requires zero payable points at completion", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /already complete/);
  assert.match(script, /continue/);
  assert.match(script, /partial campaigns resume only non-success points/);
  assert.match(script, /network-post-plan\.json/);
  assert.match(script, /remainingPoints\) !== 0/);
  assert.match(script, /all .* requested campaigns have zero remaining payable points/);
});
