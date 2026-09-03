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

test("MSE-25.71 exposes a dependency-free deployed JS payload probe", () => {
  const probe = source("scripts/public-js-payload-probe.mjs");

  assert.match(probe, /PUBLIC JS PAYLOAD PROBE/);
  assert.match(probe, /scriptUrls\(html, pageResponse\.url\)/);
  assert.match(probe, /decodedBytes/);
  assert.match(probe, /encodedBytesKnown/);
  assert.match(probe, /THIRD_PARTY_SCRIPT_COUNT=/);
  assert.match(probe, /AbortSignal\.timeout\(15000\)/);
  assert.doesNotMatch(probe, /from\s+["'](?:lighthouse|playwright|puppeteer)["']/);
});

test("JS probe gates script count and decoded payload without guessing transfer compression", () => {
  const probe = source("scripts/public-js-payload-probe.mjs");

  assert.match(probe, /max-decoded-js-bytes/);
  assert.match(probe, /max-script-count/);
  assert.match(probe, /decoded JS payload/);
  assert.match(probe, /script count/);
  assert.match(probe, /JS_PAYLOAD_GATE=/);
  assert.match(probe, /encodedBytesCoverage/);
});

test("critical public shell remains server-rendered and does not become a hydration island", () => {
  const criticalFiles = [
    "app/agence/[siteSlug]/layout.js",
    "app/agence/[siteSlug]/[[...pageSlug]]/page.js",
    "components/public-site/PublicSiteHeader.js",
    "components/public-site/PublicSiteFooter.js",
    "components/public-site/PublicSiteSections.js",
    "components/public-site/renderers/HeroV2Renderer.js",
  ];

  for (const relativePath of criticalFiles) {
    const content = source(relativePath);
    assert.doesNotMatch(content, /^\s*["']use client["'];?/m, `${relativePath} must stay server-rendered`);
  }
});
