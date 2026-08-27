"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNetworkProviderMatrix } = require("./network-provider-matrix");

const agencies = [{ id: 1, name: "Gien" }, { id: 2, name: "Nevers" }];
const directories = [
  { id: 10, name: "PagesJaunes", active: true },
  { id: 11, name: "HERE", active: true },
  { id: 12, name: "Mappy", active: false }
];
const listings = [
  { agencyId: 1, directoryId: 10, status: "validated" },
  { agencyId: 1, directoryId: 11, status: "pending" }
];

test("matrix excludes inactive directories and separates manual blocked and automated cells", () => {
  const matrix = buildNetworkProviderMatrix(agencies, directories, listings, {});
  assert.equal(matrix.summary.cells, 4);
  assert.equal(matrix.summary.validated, 1);
  assert.equal(matrix.summary.manual, 1);
  assert.equal(matrix.summary.blocked, 2);
  assert.equal(matrix.summary.monitorOnly, 0);
  assert.equal(matrix.rows.some((row) => row.providerKey === "mappy"), false);
});

test("configured contribution provider becomes automation eligible", () => {
  const matrix = buildNetworkProviderMatrix(agencies, directories, listings, { HERE_PRESENCE_ENABLED: "true", HERE_PRESENCE_API_KEY: "secret" });
  const here = matrix.rows.find((row) => row.agencyId === 1 && row.providerKey === "here");
  assert.equal(here.providerReady, true);
  assert.equal(here.operationalMode, "submission_api");
  assert.equal(here.automationEligible, true);
});
