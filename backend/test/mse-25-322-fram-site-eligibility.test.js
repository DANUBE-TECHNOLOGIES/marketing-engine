"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { publishedSiteWhere, PUBLISHED_STATUSES } = require("../src/modules/ambassade-fram/public-eligibility");

test("FRAM site query includes network tenant and all published states", () => {
  const where = publishedSiteWhere("ambassade-fram-mondescale-melun", "mondescale");
  assert.equal(where.slug, "ambassade-fram-mondescale-melun");
  assert.deepEqual(where.agency.tenant, { slug: "mondescale" });
  assert.deepEqual(where.OR[0].status.in, PUBLISHED_STATUSES);
  assert.deepEqual(where.OR[1], { publishedAt: { not: null } });
});

test("FRAM site query rejects malformed slugs", () => {
  for (const slug of ["", "../private", "Melun", "a/b", " "]) {
    assert.throws(() => publishedSiteWhere(slug, "mondescale"), RangeError);
  }
  assert.throws(() => publishedSiteWhere("melun", "../other"), RangeError);
});
