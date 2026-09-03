"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.8 exposes Mondescale typography options", () => {
  const file = source("frontend/lib/brand-studio/identity-api.js");
  assert.match(file, /"DM Serif Display"/);
  assert.match(file, /"Inter"/);
});

test("MSE-25.8 proxies imported brand assets for browser previews", () => {
  const file = source("frontend/app/media/brand-assets/[...path]/route.js");
  assert.match(file, /proxyBackendRequest/);
  assert.match(file, /"\/media\/brand-assets"/);
  assert.match(file, /export const GET = handler/);
});

test("MSE-25.8 persists legal profile through the canonical backend contract", () => {
  const file = source("frontend/lib/brand-studio/legal-api.js");
  assert.match(file, /payload\?\.resolved/);
  assert.match(file, /legalName:/);
  assert.match(file, /legalForm:/);
  assert.match(file, /registrationNumber:/);
  assert.match(file, /legalNoticeContent:/);
  assert.match(file, /privacyPolicyContent:/);
  assert.match(file, /brandStudio:/);
});

test("MSE-25.8 resolves asynchronous Next route params for publication", () => {
  const file = source(
    "frontend/app/api/site-publication/[[...path]]/route.js"
  );
  assert.match(file, /const parameters\s*=\s*await context\?\.params/);
  assert.match(file, /const path\s*=\s*await requestPath/);
});

test("MSE-25.8 publication panel imports its plan client from the API module", () => {
  const file = source(
    "frontend/components/brand-studio/SitePublicationPanel.js"
  );

  const reactImport = file.match(/import\s*\{([\s\S]*?)\}\s*from\s*"react";/)?.[1] || "";
  assert.doesNotMatch(reactImport, /fetchSitePublicationPlan/);

  assert.match(
    file,
    /fetchSitePublicationPlan[\s\S]*from\s*"\.\.\/\.\.\/lib\/brand-studio\/site-publication-api"/
  );
  assert.match(file, /await unpublishSite\(siteId\)/);
});
