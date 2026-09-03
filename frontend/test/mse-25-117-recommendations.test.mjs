import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-recommendations.js"), "utf8");

test("MSE-25.117 recommendations cover city NAP cannibalisation and local CTR", () => {
  for (const expected of ["CITY", "NAP", "CANNIBALISATION", "LOCAL_CTR"]) assert.match(source, new RegExp(expected));
  assert.match(source, /sans créer de nouvelle page doorway/);
});

test("MSE-25.117 recommendations do not mutate public pages", () => {
  assert.doesNotMatch(source, /writeFile|fetch\(|prisma|redirect\(|router\./i);
});
