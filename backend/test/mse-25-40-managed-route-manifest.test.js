"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { manifestFromPreflight } = require("../scripts/mse-25-40-opportunity-manifest");

test("managed route semantic reviews never become Website Designer opportunities", () => {
  const report = {
    version: "mse-25.40",
    operation: "semantic-preflight",
    generatedAt: "2026-08-21T00:00:00.000Z",
    readOnly: true,
    writes: false,
    safety: { verified: true },
    repository: { branch: "feature/mse-25-40-local-seo-semantic-engine", head: "abc", dirty: false },
    preview: {
      planFingerprint: "a".repeat(64),
      agencies: [{
        site: { slug: "gien", agencyId: 4, city: "Gien" },
        semanticProposals: {
          proposals: [{
            intentKey: "cruise",
            pageSlug: "croisieres",
            type: "managed-route-semantic-review",
            valueScore: 80,
            reason: "locality-partial",
            writeEligible: false,
            proposed: { seoTitle: "Croisières à Gien" },
            safeguards: { noWebsiteDesignerWrite: true, noAutomaticWrite: true },
          }],
        },
        cannibalization: [],
      }],
    },
  };

  const manifest = manifestFromPreflight(report);
  assert.equal(manifest.summary.existingPageOpportunityCount, 0);
  assert.equal(manifest.summary.managedRouteReviewCount, 1);
  assert.equal(manifest.summary.newPageEvidenceGateCount, 0);
  assert.equal(manifest.managedRouteReviews[0].writeEligible, false);
  assert.equal(manifest.managedRouteReviews[0].safeguards.noWebsiteDesignerWrite, true);
});
