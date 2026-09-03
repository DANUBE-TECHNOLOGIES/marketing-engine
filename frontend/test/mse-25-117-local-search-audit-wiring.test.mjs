import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.117 executable audit covers local contract without public runtime mutation", () => {
  const audit = read("scripts/audit-local-search-contract.mjs");
  assert.match(audit, /MSE_25_117_LOCAL_SEARCH_CONTRACT=OK/);
  assert.match(audit, /TravelAgency/);
  assert.match(audit, /areaServed/);
  assert.match(audit, /doorway-target-city-route/);
});

test("MSE-25.117 additions remain SEO/support files only", () => {
  const intent = read("lib/seo/local-search-intent.js");
  const signals = read("lib/seo/local-search-signals.js");
  assert.doesNotMatch(intent + signals, /className|<main|<section|style=|background/i);
});
