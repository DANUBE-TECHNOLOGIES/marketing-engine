"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  normalizeLaunchReadiness,
} = require("../src/modules/site-publication/readiness-client");

test("MSE-25.8 adapts agency-launch readiness for site publication", () => {
  const normalized = normalizeLaunchReadiness({
    agency: { id: 3, name: "Dax" },
    site: { id: "site-dax", slug: "dax" },
    readiness: {
      score: 100,
      ready: true,
      blockers: [],
    },
    launchState: {
      code: "ready_to_publish",
      label: "Prêt à publier",
    },
    checks: [
      { code: "SITE", label: "Mini-site", required: true, passed: true },
      { code: "IDENTITY", label: "Identité", required: true, passed: true },
      { code: "GENERAL_CONTENT", label: "Pages générales", required: true, passed: true },
      { code: "LEGAL", label: "Informations légales", required: true, passed: true },
      { code: "SEO", label: "SEO de base", required: true, passed: true },
    ],
  });

  assert.equal(normalized.score, 100);
  assert.equal(normalized.summary.required, 5);
  assert.equal(normalized.summary.completed, 5);
  assert.equal(normalized.summary.missing, 0);
  assert.equal(normalized.status, "ready_to_publish");
  assert.equal(normalized.source, "agency-launch-prepublication");
  assert.equal(normalized.checks.every((check) => check.ready), true);
});

test("MSE-25.8 site publication points readiness to backend, not public renderer", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/site-publication/routes.js"),
    "utf8"
  );

  assert.match(source, /new SiteReadinessClient\(\{\s*backendOrigin,/);
  assert.doesNotMatch(source, /SITE_PUBLICATION_FRONTEND_ORIGIN/);
  assert.doesNotMatch(source, /FRONTEND_INTERNAL_URL/);
});
