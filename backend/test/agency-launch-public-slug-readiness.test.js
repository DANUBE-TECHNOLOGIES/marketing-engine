"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  publicSiteSlugValid,
  siteCheck,
} = require("../src/modules/agency-launch/prepublication-readiness");

test("public mini-site slug accepts renderer-compatible kebab case", () => {
  assert.equal(publicSiteSlugValid("bois-colombes"), true);
  assert.equal(publicSiteSlugValid("gien45"), true);
  assert.equal(siteCheck({ id: "site-1", slug: "bois-colombes" }).passed, true);
});

test("public mini-site slug rejects spaces, accents, underscores and path separators", () => {
  for (const slug of ["Bois Colombes", "lamorlayé", "ozoir_la_ferriere", "gien/agence", "-gien", "gien-"]) {
    assert.equal(publicSiteSlugValid(slug), false, slug);
    assert.equal(siteCheck({ id: "site-1", slug }).passed, false, slug);
  }
});

test("missing mini-site cannot pass SITE readiness", () => {
  const check = siteCheck(null);
  assert.equal(check.exists, false);
  assert.equal(check.slugValid, false);
  assert.equal(check.passed, false);
});
