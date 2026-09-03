import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-query-classifier.js"), "utf8");

test("MSE-25.117 classifier distinguishes local commercial intents", () => {
  for (const expected of ["brand", "ticketing", "groups", "business", "service", "agency-local", "other"]) {
    assert.match(source, new RegExp(`\\"${expected}\\"`));
  }
});

test("MSE-25.117 classifier is deterministic and network-free", () => {
  assert.doesNotMatch(source, /fetch\(|axios|googleapis|prisma/i);
});
