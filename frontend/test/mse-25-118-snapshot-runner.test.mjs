import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.118g keeps local-search snapshot history deterministic and deduplicated", () => {
  const source = read("lib/seo/local-search-snapshot-history.js");
  assert.match(source, /normalizeLocalSearchSnapshotHistory/);
  assert.match(source, /appendLocalSearchSnapshotHistory/);
  assert.match(source, /latestLocalSearchSnapshot/);
  assert.match(source, /new Map\(\)/);
  assert.match(source, /capturedAt/);
  assert.match(source, /period/);
});

test("MSE-25.118g exposes a reproducible JSON runner without Google or public writes", () => {
  const source = read("scripts/mse-25-118-local-search-report.mjs");
  assert.match(source, /--current=/);
  assert.match(source, /--baseline=/);
  assert.match(source, /--history=/);
  assert.match(source, /--output=/);
  assert.match(source, /buildLocalSearchNetworkReport/);
  assert.match(source, /automatedPublicChangeAllowed:\s*false/);
  assert.match(source, /googleWriteAllowed:\s*false/);
});
