"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.9 keeps the public logo inside the constrained header identity", () => {
  const file = source("frontend/components/public-site/PublicSiteHeader.js");

  assert.match(file, /public-site-header-main/);
  assert.match(file, /public-site-header-logo-wrap/);
  assert.match(file, /public-site-header__brand-logo/);
  assert.match(file, /public-site-header-navrow/);
});

test("MSE-25.9 loads premium public styles after the legacy renderer styles", () => {
  const file = source("frontend/app/agence/[siteSlug]/layout.js");

  const legacy = file.indexOf('public-site.css');
  const premium = file.indexOf('premium-public.css');

  assert.ok(legacy >= 0);
  assert.ok(premium > legacy);
});

test("MSE-25.9 constrains imported brand logos on desktop and mobile", () => {
  const file = source("frontend/components/public-site/premium-public.css");

  assert.match(file, /max-height:\s*72px\s*!important/);
  assert.match(file, /@media \(max-width: 760px\)/);
  assert.match(file, /max-height:\s*52px\s*!important/);
});
