"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateAssetDecision,
  buildReviewMetadata,
} = require("../src/modules/campaign-manager/asset-review");

test("validateAssetDecision accepte une approbation", () => {
  const result = validateAssetDecision({
    status: "approved",
    reviewedBy: "Nicolas",
    comment: "Contenu validé.",
  });

  assert.equal(result.status, "approved");
  assert.equal(result.reviewedBy, "Nicolas");
});

test("validateAssetDecision impose un validateur", () => {
  assert.throws(
    () =>
      validateAssetDecision({
        status: "approved",
      }),
    {
      code: "ASSET_REVIEWER_REQUIRED",
    }
  );
});

test("validateAssetDecision impose un commentaire de rejet", () => {
  assert.throws(
    () =>
      validateAssetDecision({
        status: "rejected",
        reviewedBy: "Nicolas",
      }),
    {
      code: "ASSET_REJECTION_COMMENT_REQUIRED",
    }
  );
});

test("buildReviewMetadata conserve les métadonnées existantes", () => {
  const result = buildReviewMetadata(
    {
      source: "travel-core",
      generator: "deterministic",
    },
    {
      status: "approved",
      reviewedBy: "Nicolas",
      comment: "OK",
    }
  );

  assert.equal(result.source, "travel-core");
  assert.equal(result.generator, "deterministic");
  assert.equal(result.review.status, "approved");
  assert.equal(result.review.reviewedBy, "Nicolas");
  assert.equal(result.review.comment, "OK");
  assert.ok(result.review.reviewedAt);
});
