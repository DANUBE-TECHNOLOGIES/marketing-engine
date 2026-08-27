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
  assert.match(probe, /MEDIAN_TTFB_MS=/);
  assert.match(probe, /CACHE_CONTROL=/);
  assert.match(probe, /HERO_HIGH_PRIORITY=/);
  assert.match(probe, /HERO_BYTES=/);
  assert.match(probe, /IMAGE_BYTES_INSPECTED=/);
  assert.match(probe, /AbortSignal\.timeout\(15000\)/);
  assert.doesNotMatch(probe, /from\s+["'](?:lighthouse|playwright|puppeteer)["']/);
});

test("probe inspects hero discoverability and media transfer weight", () => {
  const probe = source("scripts/public-performance-probe.mjs");

  assert.match(probe, /fetchpriority=\["'\]high/iu);
  assert.match(probe, /loading=\["'\]eager/iu);
  assert.match(probe, /tagAttribute\(tag, "src"\)/);
  assert.match(probe, /heroMedia/);
  assert.match(probe, /content-type/);
  assert.match(probe, /cache-control/);
  assert.match(probe, /totalBytesInspected/);
  assert.match(probe, /largestImages/);
});

test("probe diagnoses modern media delivery cacheability and origins", () => {
  const probe = source("scripts/public-performance-probe.mjs");

  assert.match(probe, /function isModernImageType\(type\)/);
  assert.match(probe, /image\/avif/);
  assert.match(probe, /image\/webp/);
  assert.match(probe, /function isCacheable\(cacheControl\)/);
  assert.match(probe, /cacheLifetimeSeconds/);
  assert.match(probe, /urlOrigin/);
  assert.match(probe, /HERO_MODERN_FORMAT=/);
  assert.match(probe, /HERO_CACHEABLE=/);
  assert.match(probe, /HERO_ORIGIN=/);
  assert.match(probe, /MODERN_IMAGES=/);
  assert.match(probe, /UNCACHEABLE_IMAGES=/);
  assert.match(probe, /IMAGE_ORIGINS=/);
});

test("probe samples the deployed route and gates on median server performance", () => {
  const probe = source("scripts/public-performance-probe.mjs");

  assert.match(probe, /const samples = Math\.max\(1, Math\.min\(7,/);
  assert.match(probe, /function median\(values\)/);
  assert.match(probe, /medianTtfbMs/);
  assert.match(probe, /coldTtfbMs/);
  assert.match(probe, /median TTFB/);
});

test("probe can gate a deployed pilot on server hero and aggregate media budgets", () => {
  const probe = source("scripts/public-performance-probe.mjs");

  assert.match(probe, /const gate = arg\("gate", "false"\) === "true"/);
  assert.match(probe, /max-ttfb-ms/);
  assert.match(probe, /max-hero-bytes/);
  assert.match(probe, /max-single-image-bytes/);
  assert.match(probe, /max-total-image-bytes/);
  assert.match(probe, /hero image \$\{report\.hero\.media\.bytes\}B/);
  assert.match(probe, /inspected image payload \$\{totalBytesInspected\}B/);
  assert.match(probe, /PERFORMANCE_GATE=/);
  assert.match(probe, /hero image is not fetchPriority=high/);
  assert.match(probe, /hero image has no intrinsic dimensions/);
  assert.match(probe, /hero image has no resolvable src/);
  assert.match(probe, /gate && failures\.length/);
});
