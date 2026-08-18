"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  qualityUpliftFingerprint,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-fingerprint");

function preview() {
  return {
    version: "mse-25.31",
    siteSlug: "mondescale-gien",
    agencyId: 1,
    minimumWords: 120,
    actions: [
      {
        pageSlug: "avis",
        priority: "high",
        priorityScore: 80,
        recommendedFields: ["body", "internal-link"],
        suggestedSourceSlugs: ["home"],
        thinContent: { wordCount: 60, minimumWords: 120, missingWords: 60 },
        internalLink: { path: "/agence/mondescale-gien/avis", suggestedSourceSlugs: ["home"] },
      },
    ],
  };
}

test("same quality plan always has same sha256 fingerprint", () => {
  const left = qualityUpliftFingerprint(preview());
  const right = qualityUpliftFingerprint(preview());
  assert.equal(left, right);
  assert.match(left, /^[a-f0-9]{64}$/);
});

test("material quality plan change modifies fingerprint", () => {
  const before = preview();
  const after = preview();
  after.actions[0].thinContent.missingWords = 40;
  assert.notEqual(
    qualityUpliftFingerprint(before),
    qualityUpliftFingerprint(after)
  );
});

test("non-plan presentation fields do not alter fingerprint", () => {
  const before = preview();
  const after = { ...preview(), generatedAt: new Date().toISOString(), readOnly: true, writes: false };
  assert.equal(
    qualityUpliftFingerprint(before),
    qualityUpliftFingerprint(after)
  );
});
