"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  daysSince,
  localReviewTrustCheck,
  score,
} = require("./prepublication-readiness");

const NOW = new Date("2026-08-11T12:00:00.000Z");

test("daysSince reports whole elapsed days", () => {
  assert.equal(daysSince("2026-08-01T12:00:00.000Z", NOW), 10);
  assert.equal(daysSince(null, NOW), null);
});

test("no reviews produces a non-blocking local trust recommendation", () => {
  const check = localReviewTrustCheck(
    {
      googleReviewUrl: "https://example.test/review",
      googleLocationId: "location-1",
      reviews: [],
    },
    NOW
  );

  assert.equal(check.code, "LOCAL_TRUST");
  assert.equal(check.required, false);
  assert.equal(check.passed, false);
  assert.equal(check.reviewCount, 0);
  assert.match(check.recommendation, /Synchroniser les avis Google/);
});

test("stale reviews are detected even when replies exist", () => {
  const check = localReviewTrustCheck(
    {
      reviews: [
        {
          publishedAt: "2025-12-01T12:00:00.000Z",
          reply: "Merci pour votre confiance.",
          source: "google",
          googleReviewId: "g-1",
        },
      ],
    },
    NOW
  );

  assert.equal(check.passed, false);
  assert.equal(check.signals.freshnessOk, false);
  assert.match(check.recommendation, /flux récent/);
});

test("healthy recent Google review flow passes local trust readiness", () => {
  const check = localReviewTrustCheck(
    {
      googleReviewUrl: "https://example.test/review",
      googleLocationId: "location-1",
      reviews: [
        {
          publishedAt: "2026-08-01T12:00:00.000Z",
          reply: "Merci beaucoup.",
          source: "google_business_profile",
          googleReviewId: "g-1",
        },
        {
          publishedAt: "2026-07-15T12:00:00.000Z",
          reply: "Au plaisir de vous accompagner à nouveau.",
          source: "google",
          googleReviewId: "g-2",
        },
        {
          publishedAt: "2026-06-20T12:00:00.000Z",
          reply: null,
          source: "google",
          googleReviewId: "g-3",
        },
      ],
    },
    NOW
  );

  assert.equal(check.passed, true);
  assert.equal(check.reviewCount, 3);
  assert.equal(check.googleSourced, 3);
  assert.ok(check.responseRate >= 0.5);
  assert.equal(check.recommendation, null);
});

test("local trust remains advisory and does not inflate the 100 point score", () => {
  const checks = [
    { code: "SITE", passed: true },
    { code: "IDENTITY", passed: true },
    { code: "GENERAL_CONTENT", passed: true },
    { code: "LEGAL", passed: true },
    { code: "SEO", passed: true },
    { code: "LOCAL_SEO", passed: true },
    { code: "LOCAL_CONTENT", passed: true },
    { code: "LOCAL_TRUST", passed: true },
  ];

  assert.equal(score(checks), 100);
});
