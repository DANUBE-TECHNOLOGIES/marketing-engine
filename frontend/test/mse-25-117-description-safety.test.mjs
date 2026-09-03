import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-page-seo.js"), "utf8");

test("MSE-25.117 descriptions remain bounded and locally relevant", () => {
  assert.match(source, /MAX_DESCRIPTION_LENGTH = 165/);
  assert.match(source, /containsLocalSignal/);
  assert.match(source, /truncateSentence/);
});

test("MSE-25.117 catchment mention is bounded", () => {
  assert.match(source, /resolvedTargetCities|targetCities/);
  assert.match(source, /limit: 4/);
});
