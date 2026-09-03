import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const sitemap = fs.readFileSync(path.join(root, "app/sitemap.js"), "utf8");
const intentMap = fs.readFileSync(path.join(root, "lib/seo/local-search-intent-map.js"), "utf8");

test("MSE-25.117 does not turn catchment cities into indexable routes", () => {
  assert.doesNotMatch(sitemap, /resolvedTargetCities|targetCities|nearbyCities/);
  assert.doesNotMatch(intentMap, /targetCities|nearbyCities|serviceAreas.*map/i);
});
