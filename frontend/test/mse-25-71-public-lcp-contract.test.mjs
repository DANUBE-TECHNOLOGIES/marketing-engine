import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");
const probe = fs.readFileSync(path.join(frontendRoot, "scripts/public-lcp-contract-probe.mjs"), "utf8");

test("MSE-25.71 validates the deployed LCP preload contract", () => {
  assert.match(probe, /rel=\["'\]preload/iu);
  assert.match(probe, /as=\["'\]image/iu);
  assert.match(probe, /fetchpriority=\["'\]high/iu);
  assert.match(probe, /heroPreloaded/);
  assert.match(probe, /HERO_PRELOADED=/);
  assert.match(probe, /LCP_CONTRACT_GATE=/);
});

test("MSE-25.71 rejects competing critical image candidates", () => {
  assert.match(probe, /highPriority\.length > 1/);
  assert.match(probe, /competingCriticalImages\.length > 1/);
  assert.match(probe, /multiple fetchPriority=high images/);
  assert.match(probe, /multiple eager\/high-priority image contenders/);
  assert.match(probe, /CRITICAL_IMAGE_CANDIDATES=/);
});

test("LCP contract probe remains dependency-free", () => {
  assert.match(probe, /AbortSignal\.timeout\(15000\)/);
  assert.doesNotMatch(probe, /from\s+["'](?:lighthouse|playwright|puppeteer|cheerio|jsdom)["']/);
});
