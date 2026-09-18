import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

const read = (relative) =>
  fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.245 cockpit consumes directional intelligence", () => {
  const page = read("app/ranking-grid/page.js");
  const panel = read(
    "app/ranking-grid/DirectionalIntelligencePanel.js"
  );

  assert.match(page, /DirectionalIntelligencePanel/);

  assert.match(
    page,
    /directional-intelligence\?campaignId=\$\{latest\.id\}/
  );

  assert.match(panel, /Profil d’autorité géographique/);
  assert.match(panel, /Autorité par direction/);
  assert.match(panel, /Recommandations automatiques/);
});

test("MSE-25.245 cockpit remains provider-safe", () => {
  const page = read("app/ranking-grid/page.js");
  const panel = read(
    "app/ranking-grid/DirectionalIntelligencePanel.js"
  );

  assert.doesNotMatch(
    page + panel,
    /method:\s*["']POST["']/
  );

  assert.match(
    panel,
    /aucun appel DataForSEO et aucune écriture en base/
  );
});
