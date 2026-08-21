import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("relaxed network rollout lowers only confidence score and preserves original legal gates", () => {
  const relaxed = read("scripts/partner-logo-network-relaxed-rollout.mjs");
  const original = read("scripts/partner-logo-network-rollout.mjs");

  assert.match(relaxed, /Math\.max\(90/);
  assert.match(relaxed, /--minimum-score=92/);
  assert.match(relaxed, /network-rollout-contract-changed/);
  assert.match(relaxed, /partner-logo-network-rollout\.mjs/);

  assert.match(original, /asset-permission-review/);
  assert.match(original, /permission-required/);
  assert.match(original, /permission-review/);
  assert.match(original, /identity-review/);
  assert.match(original, /verification-pending/);
  assert.match(original, /strongLogoSignal/);
  assert.match(original, /tokenHits > 0/);
});
