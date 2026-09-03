import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-page-contract.js"), "utf8");

test("MSE-25.117 page contract reuses established local metadata", () => {
  assert.match(source, /buildLocalPageSeo/);
  assert.match(source, /buildLocalSearchSignals/);
  assert.match(source, /title: seo\.title/);
  assert.match(source, /description: seo\.description/);
  assert.match(source, /heading: seo\.heading/);
});

test("MSE-25.117 page contract adds intent data without rendering markup", () => {
  assert.match(source, /primaryQuery/);
  assert.match(source, /supportingQueries/);
  assert.match(source, /nap: signals\.nap/);
  assert.doesNotMatch(source, /<main|<section|className|dangerouslySetInnerHTML/i);
});
