import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../../scripts/mse-25-125bs-maurepas-run-prepared-7x7.sh", import.meta.url),
  "utf8",
);

test("prepared Maurepas 7x7 runner requires an exact campaign id", () => {
  assert.match(source, /MSE_25_125BQ_CAMPAIGN_ID/);
  assert.match(source, /RUN-MAUREPAS-PREPARED-7X7/);
  assert.match(source, /exact prepared campaign/);
  assert.match(source, /campaignIds=\$CAMPAIGN_ID/);
  assert.match(source, /campaigns\/\$CAMPAIGN_ID\/run/);
});

test("prepared runner never creates a new campaign or enables the provider", () => {
  assert.doesNotMatch(source, /POST \"\$BASE_URL\/rankings\/grid\/campaigns\"/);
  assert.doesNotMatch(source, /RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.match(source, /provider is not explicitly enabled inside backend/);
});
