import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("ranking grid cockpit exposes calibrated territorial priorities", () => {
  const page = read("app/ranking-grid/page.js");
  const panel = read("app/ranking-grid/TerritorialSeoPanel.js");
  assert.match(page, /TerritorialSeoPanel/);
  assert.match(panel, /spatial-priorities\?campaignId=\$\{campaignId\}/);
  assert.match(panel, /P1 \{summary\.p1 \|\| 0\}/);
  assert.match(panel, /dominantPriorityDirection/);
});

test("IGN action plan remains explicit and lazy", () => {
  const page = read("app/ranking-grid/page.js");
  const panel = read("app/ranking-grid/TerritorialSeoPanel.js");
  assert.match(page, /territorialPlan/);
  assert.match(panel, /if \(loadPlan && hasUrgentTerritories\)/);
  assert.match(panel, /action-plan\?campaignId=\$\{campaignId\}&levels=p1,p2/);
  assert.match(panel, /Charger le plan territorial/);
  assert.doesNotMatch(page, /action-plan\?campaignId/);
});

test("cockpit tolerates methodology-incompatible historical comparison", () => {
  const page = read("app/ranking-grid/page.js");
  assert.match(page, /getJsonOrNull/);
  assert.match(page, /Legacy 15z and calibrated 14z campaigns are intentionally non-comparable/);
  assert.match(page, /compare\?fromCampaignId=.*toCampaignId/);
  assert.match(page, /méthodologie strictement comparable/);
});

test("cockpit preserves read-only DataForSEO contract", () => {
  const page = read("app/ranking-grid/page.js");
  const panel = read("app/ranking-grid/TerritorialSeoPanel.js");
  assert.match(page, /aucun appel DataForSEO depuis cet écran/);
  assert.match(panel, /Il ne déclenche aucun appel DataForSEO et n’écrit rien en base/);
  assert.doesNotMatch(page + panel, /method:\s*["']POST["']/);
});
