"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.resolve(
  __dirname,
  "../../frontend/components/public-site/renderers/ctaLinks.js"
);

const source = fs.readFileSync(sourcePath, "utf8");

test("MSE-25.89 canonicalizes legacy inspirations CTA paths before rendering", () => {
  assert.match(source, /PUBLIC_ROUTE_ALIASES/);
  assert.match(source, /inspirations:\s*"inspiration"/);
  assert.match(source, /function canonicalPublicSlug/);
  assert.match(source, /const normalized = canonicalPublicSlug\(slug\)/);
});

test("MSE-25.89 keeps the legacy alias accepted as input but never as the rendered canonical route", () => {
  assert.match(
    source,
    /isAgencyScopedPublicPath[\s\S]*inspiration\|inspirations/
  );
  assert.match(
    source,
    /parts\[0\] = PUBLIC_ROUTE_ALIASES\[first\]/
  );
});
