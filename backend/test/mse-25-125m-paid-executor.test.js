"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function resolveScriptPath() {
  const candidates = [
    path.resolve(__dirname, "../../scripts/mse-25-125m-paid-campaign.sh"),
    path.resolve(process.cwd(), "../scripts/mse-25-125m-paid-campaign.sh"),
    "/scripts/mse-25-125m-paid-campaign.sh",
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

test("paid executor requires one campaign, exact ack, plan and max cost", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /MSE_25_125M_CAMPAIGN_ID/);
  assert.match(script, /RUN-SINGLE-RANKING-GRID-CAMPAIGN/);
  assert.match(script, /MSE_25_125M_MAX_COST_USD:-0\.05/);
  assert.match(script, /paid-plan\?campaignIds=\$CAMPAIGN_ID/);
  assert.match(script, /estimated cost .* exceeds max/);
  assert.match(script, /summary\?\.campaigns\) !== 1/);
  assert.match(script, /remainingPoints\) <= 0/);
});

test("paid executor never enables provider and delegates to guarded runtime", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /this script will not enable it/);
  assert.doesNotMatch(script, /export RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(script, /RANKING_GRID_DATAFORSEO_ENABLED=true\s+docker compose/);
  assert.match(script, /MSE_25_125_PAID_ACK="RUN-25-POINT-DATAFORSEO"/);
  assert.match(script, /bash "\$RUNTIME_SCRIPT" --run-paid/);
});

test("paid executor requires balance preflight and verifies zero remaining points", (t) => {
  if (!requireHostScript(t)) return;
  assert.match(script, /appendix\/user_data/);
  assert.match(script, /balance is below/);
  assert.match(script, /post-plan\.json/);
  assert.match(script, /remainingPoints\) !== 0/);
  assert.match(script, /zero remaining payable points/);
});
