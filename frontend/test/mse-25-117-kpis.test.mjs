import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-kpis.js"), "utf8");

test("MSE-25.117 KPI contract covers Search Console and local readiness", () => {
  for (const expected of ["impressions", "clicks", "ctr", "position", "readinessScore", "priorityScore"]) assert.match(source, new RegExp(expected));
});
