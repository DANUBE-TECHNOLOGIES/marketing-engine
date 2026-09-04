import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.125F cockpit consumes persisted ranking grid read APIs only", () => {
  const source = read("app/ranking-grid/page.js");
  assert.match(source, /\/rankings\/grid\/history\?/);
  assert.match(source, /\/rankings\/grid\/campaigns\/\$\{latest\.id\}\/heatmap/);
  assert.match(source, /\/rankings\/grid\/compare\?/);
  assert.doesNotMatch(source, /\/run["'`]/);
  assert.doesNotMatch(source, /snapshots/);
  assert.doesNotMatch(source, /DATAFORSEO_PASSWORD|DATAFORSEO_LOGIN|RANKING_GRID_DATAFORSEO_ENABLED/);
});

test("MSE-25.125F cockpit renders KPIs heatmap history and safe comparison state", () => {
  const source = read("app/ranking-grid/page.js");
  for (const expected of [
    "Visibilité locale Maps",
    "Carte de visibilité Google Maps",
    "Position agence",
    "Historique des relevés",
    "Évolution depuis le relevé précédent",
    "aucun appel DataForSEO depuis cet écran",
  ]) assert.match(source, new RegExp(expected, "i"));
  assert.match(source, /band === "top3"/);
  assert.match(source, /band === "top10"/);
  assert.match(source, /band === "top20"/);
  assert.match(source, /band === "not_found"|return "bg-rose-100/);
});

test("MSE-25.125F cockpit is discoverable from Local Engine navigation", () => {
  const layout = read("app/components/MainLayout.js");
  const admin = read("app/admin-network/page.js");
  assert.match(layout, /Visibilité Maps.*\/ranking-grid/s);
  assert.match(admin, /Visibilité locale Maps.*\/ranking-grid/s);
});
