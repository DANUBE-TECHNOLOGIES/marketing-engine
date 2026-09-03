import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/search-console-local-baseline.js"), "utf8");

test("MSE-25.117 baseline preserves observed local Search Console signals", () => {
  assert.match(source, /agence de voyage nevers.*clicks: 3, impressions: 42/);
  assert.match(source, /agence de voyage dax.*clicks: 0, impressions: 64/);
  assert.match(source, /agence de voyage gien.*clicks: 1, impressions: 10/);
  assert.match(source, /agence de voyage bois colombes.*impressions: 9/);
  assert.match(source, /agence de voyage maurepas.*impressions: 3/);
});

test("MSE-25.117 baseline remains read-only and contains no Google write client", () => {
  assert.doesNotMatch(source, /googleapis|searchconsole.*insert|fetch\(|POST|PUT|PATCH/i);
});
