import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const summary = fs.readFileSync(path.join(root, "lib/seo/local-search-summary.js"), "utf8");
const recommendations = fs.readFileSync(path.join(root, "lib/seo/local-search-recommendations.js"), "utf8");

test("MSE-25.117 summary and recommendations are reusable outside rendering", () => {
  assert.match(summary, /export function localSearchSummary/);
  assert.match(recommendations, /export function localSearchRecommendations/);
  assert.doesNotMatch(summary + recommendations, /react|next\/|jsx|className/i);
});
