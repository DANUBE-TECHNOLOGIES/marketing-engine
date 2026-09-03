import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-agency-key.js"), "utf8");

test("MSE-25.117 metrics use stable agency and query keys", () => {
  assert.match(source, /agency\.slug/);
  assert.match(source, /site\?\.slug/);
  assert.match(source, /agency\.city/);
  assert.match(source, /localSearchMetricKey/);
});

test("MSE-25.117 agency key contains no hard-coded agency identity", () => {
  assert.doesNotMatch(source, /dax|gien|nevers|maurepas|lamorlaye|ozoir|bois.colombes/i);
});
