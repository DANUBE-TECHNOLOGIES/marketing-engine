import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

function source(relativePath) {
  return fs.readFileSync(path.join(frontendRoot, relativePath), "utf8");
}

test("MSE-25.71 exposes a dependency-free live public performance probe", () => {
  const packageJson = JSON.parse(source("package.json"));
  const probe = source("scripts/public-performance-probe.mjs");

  assert.equal(packageJson.scripts["perf:probe"], "node scripts/public-performance-probe.mjs");
  assert.match(probe, /PUBLIC_PERFORMANCE_URL/);
  assert.match(probe, /TTFB_MS=/);
  assert.match(probe, /CACHE_CONTROL=/);
  assert.match(probe, /HERO_HIGH_PRIORITY=/);
  assert.match(probe, /IMAGE_BYTES_INSPECTED=/);
  assert.match(probe, /AbortSignal\.timeout\(15000\)/);
  assert.doesNotMatch(probe, /from\s+["'](?:lighthouse|playwright|puppeteer)["']/);
});

test("probe inspects hero discoverability and media transfer weight", () => {
  const probe = source("scripts/public-performance-probe.mjs");

  assert.match(probe, /fetchpriority=["']high["']/i);
  assert.match(probe, /loading=["']eager["']/i);
  assert.match(probe, /content-type/);
  assert.match(probe, /cache-control/);
  assert.match(probe, /totalBytesInspected/);
  assert.match(probe, /largest:/);
});
