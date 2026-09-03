"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { manifestFromPreflight } = require("../scripts/mse-25-40-opportunity-manifest");

function report() {
  return {
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
          proposals: [
            {
              intentKey: "ticketing",
              pageSlug: "services",
              type: "existing-page-semantic-uplift",
              valueScore: 91,
              reason: "intent-weak",
              proposed: { seoTitle: "Billets d’avion et vols à Gien" },
              safeguards: { noAutomaticWrite: true },
            },
            {
              intentKey: "cruise",
              pageSlug: null,
              type: "new-page-evidence-gate",
              suggestedTitle: "Croisières à Gien",
              suggestedH1: "Croisières à Gien",
              editorialBrief: { targetWords: 180 },
            },
          ],
        },
        cannibalization: [{ intentKey: "agency", severity: "low", blocking: false, pages: [{ slug: "home" }, { slug: "agence" }] }],
      }],
    },
  };
}

test("opportunity manifest separates existing-page uplifts from new-page evidence gates", () => {
  const manifest = manifestFromPreflight(report());
  assert.equal(manifest.readOnly, true);
  assert.equal(manifest.writes, false);
  assert.equal(manifest.summary.existingPageOpportunityCount, 1);
  assert.equal(manifest.summary.newPageEvidenceGateCount, 1);
  assert.equal(manifest.summary.automaticWriteCount, 0);
  assert.equal(manifest.opportunities[0].intentKey, "ticketing");
  assert.equal(manifest.evidenceGates[0].requiresSearchDemandEvidence, true);
  assert.match(manifest.manifestFingerprint, /^[0-9a-f]{64}$/);
});

test("opportunity manifest refuses an unsafe preflight", () => {
  const input = report();
  input.safety.verified = false;
  assert.throws(() => manifestFromPreflight(input), { code: "MSE_25_40_UNSAFE_PREFLIGHT_REPORT" });
});
