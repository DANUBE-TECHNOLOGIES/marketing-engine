import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const page = fs.readFileSync(path.join(root, "app/agence/[siteSlug]/[[...pageSlug]]/page.js"), "utf8");

test("MSE-25.117 preserves canonical generation on public mini-site pages", () => {
  assert.match(page, /canonical/i);
  assert.match(page, /alternates/);
});

test("MSE-25.117 does not add alternate city canonicals", () => {
  assert.doesNotMatch(page, /targetCities.*canonical|nearby.*canonical/is);
});
