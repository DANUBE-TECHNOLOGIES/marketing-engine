import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "scripts/partner-logo-network-deep-rollout.mjs"), "utf8");

test("deep network logo rollout expands official-source discovery without bypassing holds", () => {
  assert.match(source, /application\\\/ld\\\+json/);
  assert.match(source, /structured-logo/);
  assert.match(source, /itemprop-logo/);
  assert.match(source, /extractStylesheets/);
  assert.match(source, /extractSecondaryLinks/);
  assert.match(source, /press\|presse\|media\|brand\|marque\|logo\|kit/);
  assert.match(source, /asset-permission-review/);
  assert.match(source, /permission-required/);
  assert.match(source, /identity-review/);
  assert.match(source, /verification-pending/);
  assert.match(source, /unsafe-svg-active-content/);
  assert.match(source, /unsafe-svg-external-reference/);
  assert.match(source, /2 \* 1024 \* 1024/);
  assert.match(source, /network-deep-official-source-crawl/);
});
