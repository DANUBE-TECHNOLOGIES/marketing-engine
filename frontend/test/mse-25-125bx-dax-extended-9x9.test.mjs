import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(
  new URL("../../scripts/mse-25-125bx-dax-extended-9x9.sh", import.meta.url),
  "utf8",
);

test("BX prepares only an exact Dax 9x9 extended campaign", () => {
  assert.match(source, /MSE_25_125BX_BASELINE_CAMPAIGN_ID/);
  assert.match(source, /baseline city is not Dax/);
  assert.match(source, /baseline agencyId is not Dax agency 3/);
  assert.match(source, /gridSize: 9/);
  assert.match(source, /points\.length!==81/);
  assert.match(source, /row\)===4&&Number\(p\.col\)===4/);
  assert.match(source, /MSE_25_125BX_SPACING_KM:-2/);
  assert.match(source, /no DataForSEO call performed/);

  // Preparation must never execute a paid measurement or toggle the provider.
  assert.doesNotMatch(source, /campaigns\/\$CAMPAIGN_ID\/run/);
  assert.doesNotMatch(source, /RANKING_GRID_DATAFORSEO_ENABLED=true/);
  assert.doesNotMatch(source, /DATAFORSEO_LOGIN/);
  assert.doesNotMatch(source, /DATAFORSEO_PASSWORD/);
});
