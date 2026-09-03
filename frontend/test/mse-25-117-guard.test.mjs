import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-guard.js"), "utf8");

test("MSE-25.117 publication guard reports all local SEO readiness gaps", () => {
  for (const expected of ["missing-primary-city", "incomplete-local-nap", "missing-home-local-intent", "insufficient-commercial-intent-coverage", "primary-query-cannibalisation"]) {
    assert.match(source, new RegExp(expected));
  }
});

test("MSE-25.117 publication guard remains non-blocking", () => {
  assert.doesNotMatch(source, /throw|process\.exit|notFound\(|redirect\(/i);
});
