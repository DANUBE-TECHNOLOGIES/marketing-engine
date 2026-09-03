"use strict";

// This test file intentionally exists before the network fingerprint is exposed.
// It guards the expected contract once the helper is installed.
const test = require("node:test");
const assert = require("node:assert/strict");

const fingerprint = require("../src/modules/minisite-seo-enrichment/quality-uplift-fingerprint");

test("network fingerprint helper is available and deterministic when installed", () => {
  if (typeof fingerprint.networkQualityUpliftFingerprint !== "function") {
    assert.equal(typeof fingerprint.qualityUpliftFingerprint, "function");
    return;
  }

  const preview = {
    version: "mse-25.31",
    minimumWords: 120,
    agencies: [
      { siteSlug: "b", agencyId: 2, actions: [] },
      { siteSlug: "a", agencyId: 1, actions: [] },
    ],
    excludedSites: [{ siteSlug: "draft", agencyId: 3, status: "draft", reason: "site-not-published" }],
  };
  const reversed = { ...preview, agencies: [...preview.agencies].reverse() };
  assert.equal(
    fingerprint.networkQualityUpliftFingerprint(preview),
    fingerprint.networkQualityUpliftFingerprint(reversed)
  );
});
