"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNetworkCoverage } = require("./network-coverage");

test("network coverage reports validated pending and missing cells", () => {
  const agencies = [{ id: 1, name: "Gien" }, { id: 2, name: "Nevers" }];
  const directories = [
    { id: 10, name: "PagesJaunes" },
    { id: 11, name: "Mappy" }
  ];
  const listings = [
    { agencyId: 1, directoryId: 10, status: "validated", listingUrl: "https://pagesjaunes.fr/a" },
    { agencyId: 1, directoryId: 11, status: "pending", listingUrl: "https://mappy.com/a" }
  ];
  const coverage = buildNetworkCoverage(agencies, directories, listings);
  assert.equal(coverage.summary.total, 4);
  assert.equal(coverage.summary.validated, 1);
  assert.equal(coverage.summary.pending, 1);
  assert.equal(coverage.summary.missing, 2);
  assert.equal(coverage.summary.coveragePercent, 25);
  assert.equal(coverage.rows.length, 4);
});
