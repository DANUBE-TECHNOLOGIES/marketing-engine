import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.117 local signals are sourced from agency/site data", () => {
  const source = read("lib/seo/local-search-signals.js");
  assert.match(source, /agency\?\.address \|\| site\?\.address/);
  assert.match(source, /agency\?\.postalCode \|\| site\?\.postalCode/);
  assert.match(source, /agency\?\.city \|\| site\?\.city/);
  assert.match(source, /agency\?\.phone \|\| site\?\.phone/);
  assert.doesNotMatch(source, /0973037220|7500[0-9]|Paris/i);
});

test("MSE-25.117 catchment remains explicit and bounded", () => {
  const source = read("lib/seo/local-search-signals.js");
  assert.match(source, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
  assert.doesNotMatch(source, /fetch\(|geocod|radius|kilomet/i);
});

test("MSE-25.117 does not use meta keywords or hidden keyword stuffing", () => {
  const seo = read("lib/seo/local-page-seo.js");
  const signals = read("lib/seo/local-search-signals.js");
  assert.doesNotMatch(seo, /keywords\s*:/i);
  assert.doesNotMatch(signals, /keywords\s*:/i);
});
