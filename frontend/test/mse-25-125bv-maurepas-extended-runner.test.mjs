import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../../scripts/mse-25-125bv-maurepas-run-prepared-11x11.sh", import.meta.url),
  "utf8",
);

test("BV only runs an exact prepared 11x11 Maurepas campaign behind explicit guards", () => {
  assert.match(source, /MSE_25_125BV_BASELINE_CAMPAIGN_ID/);
  assert.match(source, /MSE_25_125BV_CAMPAIGN_ID/);
  assert.match(source, /RUN-MAUREPAS-EXTENDED-11X11/);
  assert.match(source, /MSE_25_125BV_MAX_COST_USD:-0\.25/);
  assert.match(source, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.match(source, /provider is not explicitly enabled inside backend/);
  assert.match(source, /gridSize\)!==11/);
  assert.match(source, /points\?\.length!==121/);
  assert.match(source, /spacingKm\)-3/);
  assert.match(source, /row\)===5&&Number\(p\.col\)===5/);
  assert.match(source, /paid-plan\?campaignIds=\$CAMPAIGN_ID/);
  assert.match(source, /p\.mode!==['"]read_only['"]/);
  assert.match(source, /remaining>121/);
  assert.match(source, /estimated>max/);
  assert.match(source, /appendix\/user_data/);
  assert.match(source, /campaigns\/\$CAMPAIGN_ID\/run/);

  // Exact-ID runner must never create a campaign or toggle the provider itself.
  assert.doesNotMatch(source, /POST \"\$BASE_URL\/rankings\/grid\/campaigns\"/);
  assert.doesNotMatch(source, /RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(source, /docker compose.*RANKING_GRID_DATAFORSEO_ENABLED/);
});
