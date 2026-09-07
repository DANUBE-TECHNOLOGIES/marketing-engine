import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../../scripts/mse-25-125bu-maurepas-extended-11x11.sh", import.meta.url),
  "utf8",
);

test("BU prepares an 11x11 Maurepas extended campaign without paid execution", () => {
  assert.match(source, /gridSize:\s*11/);
  assert.match(source, /SPACING_KM=.*:-3/);
  assert.match(source, /points\.length!==121/);
  assert.match(source, /row\)===5&&Number\(p\.col\)===5/);
  assert.match(source, /MSE_25_125BU_BASELINE_CAMPAIGN_ID/);
  assert.match(source, /POST.*\/rankings\/grid\/campaigns/);
  assert.doesNotMatch(source, /campaigns\/\$CAMPAIGN_ID\/run/);
  assert.doesNotMatch(source, /RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(source, /DATAFORSEO_LOGIN/);
  assert.match(source, /PREPARED ONLY: no DataForSEO call performed/);
});
