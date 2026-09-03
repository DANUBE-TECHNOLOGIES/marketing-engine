#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const exists = (relative) => fs.existsSync(path.join(root, relative));

function fail(message) {
  console.error(`MSE_25_91_CANONICAL_DRIFT=FAIL ${message}`);
  process.exit(1);
}

const layout = read("frontend/app/agence/[siteSlug]/layout.js");
const compose = read("docker-compose.yml");
const heroCss = read("frontend/components/public-site/network-home-hero.css");
const logoCss = read("frontend/components/public-site/mse-25-91-final-public-fixes.css");

const retiredFiles = [
  "frontend/components/public-site/logo-emphasis.css",
  "frontend/components/public-site/PublicPaymentMethodsBand.js",
];

for (const retired of retiredFiles) {
  if (exists(retired)) fail(`retired file reintroduced: ${retired}`);
}

if (layout.includes("logo-emphasis.css")) fail("retired logo-emphasis.css import reintroduced");
if (layout.includes("PublicPaymentMethodsBand")) fail("duplicate payment band reintroduced in public layout");

const canonicalImports = [
  "network-home-hero.css",
  "public-reassurance-band.css",
  "mse-25-91-final-public-fixes.css",
];
for (const marker of canonicalImports) {
  const count = layout.split(marker).length - 1;
  if (count !== 1) fail(`expected exactly one ${marker} import, got ${count}`);
}

if (!heroCss.includes("width: min(1480px, calc(100% - 48px))")) {
  fail("contained home hero width contract missing");
}
if (!heroCss.includes("height: 460px")) fail("canonical home hero height contract missing");
if (heroCss.includes("52vh")) fail("legacy viewport-driven hero height reintroduced");

if (!logoCss.includes("flex: 0 0 310px !important")) fail("canonical logo footprint missing");
if (!logoCss.includes("transform: scale(1.9) !important")) fail("canonical padded-logo scaling missing");
if (logoCss.includes("scale(2.75)")) fail("oversized legacy logo scaling reintroduced");

if (!compose.includes('BACKEND_INTERNAL_URL: "http://backend:4000"')) {
  fail("canonical backend DNS missing from frontend runtime");
}
if (!compose.includes('MONDESCALE_BACKEND_URL: "http://backend:4000"')) {
  fail("canonical Mondescale backend DNS missing from frontend runtime");
}
if (compose.includes('BACKEND_INTERNAL_URL: "http://mle-backend:4000"')) {
  fail("legacy mle-backend frontend DNS reintroduced");
}

console.log("MSE_25_91_CANONICAL_DRIFT=OK");
console.log("PUBLIC_STACK=canonical");
console.log("RETIRED_FILES=2");
