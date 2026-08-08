"use strict";

const ASSET_REVIEW_STATUSES = new Set([
  "review",
  "approved",
  "rejected",
]);

function httpError(message, statusCode, code) {
  return Object.assign(
    new Error(message),
    { statusCode, code }
  );
}

function validateAssetDecision(input = {}) {
  const status = String(input.status || "")
    .trim()
    .toLowerCase();

  if (!ASSET_REVIEW_STATUSES.has(status)) {
    throw httpError(
      "Le statut doit être review, approved ou rejected.",
      400,
      "INVALID_ASSET_REVIEW_STATUS"
    );
  }

  const reviewedBy =
    String(input.reviewedBy || "").trim() || null;

  const comment =
    String(input.comment || "").trim() || null;

  if (
    ["approved", "rejected"].includes(status) &&
    !reviewedBy
  ) {
    throw httpError(
      "Le nom du validateur est obligatoire.",
      400,
      "ASSET_REVIEWER_REQUIRED"
    );
  }

  if (status === "rejected" && !comment) {
    throw httpError(
      "Un commentaire est obligatoire pour rejeter un contenu.",
      400,
      "ASSET_REJECTION_COMMENT_REQUIRED"
    );
  }

  return {
    status,
    reviewedBy,
    comment,
  };
}

function buildReviewMetadata(
  currentMetadata,
  decision
) {
  const metadata =
    currentMetadata &&
    typeof currentMetadata === "object"
      ? currentMetadata
      : {};

  return {
    ...metadata,

    review: {
      status: decision.status,
      reviewedBy: decision.reviewedBy,
      comment: decision.comment,
      reviewedAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  ASSET_REVIEW_STATUSES,
  validateAssetDecision,
  buildReviewMetadata,
};
