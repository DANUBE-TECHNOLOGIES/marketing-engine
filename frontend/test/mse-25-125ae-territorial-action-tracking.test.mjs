import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("cockpit loads tracked actions without external ranking calls", () => {
  const panel = read("app/ranking-grid/TerritorialSeoPanel.js");
  assert.match(panel, /territorial-actions\?agencyId=\$\{agencyId\}&keywordId=\$\{keywordId\}/);
  assert.match(panel, /Actions suivies/);
  assert.match(panel, /TerritorialActionTracker/);
});

test("tracked recommendations support todo in-progress done lifecycle", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /todo:\s*"À faire"/);
  assert.match(tracker, /in_progress:\s*"En cours"/);
  assert.match(tracker, /done:\s*"Terminé"/);
  assert.match(tracker, /Responsable/);
  assert.match(tracker, /Note \/ action réalisée/);
});

test("tracked actions measure next comparable grid and never trigger DataForSEO", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  const proxy = read("app/api/ranking-grid/territorial-actions/route.js");
  assert.match(tracker, /prochain relevé 14z comparable/);
  assert.match(tracker, /averageRankGain/);
  assert.match(proxy, /\/rankings\/grid\/territorial-actions/);
  assert.doesNotMatch(tracker + proxy, /DataForSEO|dataforseo/i);
});

test("recommendation tracking remains explicit user action", () => {
  const tracker = read("app/ranking-grid/TerritorialActionTracker.js");
  assert.match(tracker, /onClick=\{\(\) => create\(territory, recommendation\)\}/);
  assert.match(tracker, /"Suivre"/);
  assert.doesNotMatch(tracker, /useEffect\([^]*create\(/);
});
