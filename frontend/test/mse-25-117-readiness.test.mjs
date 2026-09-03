import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.117 readiness checks local data and intent coverage", () => {
  const source = read("lib/seo/local-search-readiness.js");
  assert.match(source, /hasCompleteLocalNap/);
  assert.match(source, /commercialIntentMap/);
  assert.match(source, /noPrimaryCannibalisation/);
  assert.match(source, /score:/);
});

test("MSE-25.117 readiness is advisory and does not block public rendering", () => {
  const source = read("lib/seo/local-search-readiness.js");
  assert.doesNotMatch(source, /notFound\(|redirect\(|throw new Error|process\.exit/i);
});
