"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(
  path.join(__dirname, "../../scripts/mse-25-125x-paid-calibrated-network.sh"),
  "utf8",
);

test("calibrated network executor requires dedicated ACK and exact 14z methodology", () => {
  assert.match(script, /RUN-CALIBRATED-RANKING-GRID-NETWORK/);
  assert.match(script, /mse-25\.125u-z14-v1:z14:d100:sp0:sta1/);
  assert.match(script, /exactly 9 calibrated network campaigns are required/);
});

test("calibrated network executor is bounded to 225 points and $0.45 by default", () => {
  assert.match(script, /MSE_25_125X_MAX_TOTAL_COST_USD:-0\.45/);
  assert.match(script, /remaining > 225/);
  assert.match(script, /MSE_25_125X_MAX_CAMPAIGN_COST_USD:-0\.05/);
});

test("calibrated network executor never enables provider itself", () => {
  assert.match(script, /provider is not explicitly enabled inside backend; this script will not enable it/);
  assert.doesNotMatch(script, /docker exec[^\n]*RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(script, /sed[^\n]*RANKING_GRID_DATAFORSEO_ENABLED/);
});

test("calibrated executor delegates only after campaign and paid-plan validation", () => {
  const campaignGuard = script.indexOf("methodology key mismatch");
  const paidPlanGuard = script.indexOf("paid-plan safety invariant failed");
  const delegate = script.indexOf('bash "$NETWORK_SCRIPT"');
  assert.ok(campaignGuard >= 0 && paidPlanGuard >= 0 && delegate >= 0);
  assert.ok(campaignGuard < delegate);
  assert.ok(paidPlanGuard < delegate);
});
