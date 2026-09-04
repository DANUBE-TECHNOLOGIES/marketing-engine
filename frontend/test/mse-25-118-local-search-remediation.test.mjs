import assert from "node:assert/strict";
import test from "node:test";

import { buildLocalSearchRemediation, buildLocalSearchRemediationPlan } from "../lib/seo/local-search-remediation.js";

test("MSE-25.118c prioritises Dax as a SERP review when visibility exists without clicks", () => {
  const result = buildLocalSearchRemediation({
    agencyKey: "dax",
    measurement: { assessment: { status: "visibility-no-clicks", confidence: "usable", recommendation: "review-serp-snippet-and-position" } },
  });
  assert.equal(result.actionType, "serp-snippet-review");
  assert.equal(result.priorityGuidance, "visibility-no-clicks");
  assert.equal(result.publicationState, "unknown");
});

test("MSE-25.118c keeps low-volume Bois-Colombes and Maurepas in observation mode", () => {
  for (const agencyKey of ["bois-colombes", "maurepas"]) {
    const result = buildLocalSearchRemediation({
      agencyKey,
      measurement: { assessment: { status: "low-volume", confidence: "low", recommendation: "collect-more-data" } },
    });
    assert.equal(result.actionType, "collect-more-data");
    assert.equal(result.priorityGuidance, "exposure-gap");
  }
});

test("MSE-25.118c verifies indexation first for Lamorlaye and Ozoir when data is absent", () => {
  for (const agencyKey of ["lamorlaye", "ozoir"]) {
    const result = buildLocalSearchRemediation({ agencyKey, measurement: null });
    assert.equal(result.actionType, "indexation-and-intent-check");
    assert.equal(result.recommendation, "verify-indexation-and-query-target");
  }
});

test("MSE-25.118c preserves relative positive signals for Nevers and Gien", () => {
  const plan = buildLocalSearchRemediationPlan(["nevers", "gien"].map((agencyKey) => ({
    agencyKey,
    measurement: { assessment: { status: "healthy", confidence: "usable", recommendation: "monitor" } },
  })));
  assert.deepEqual(plan.map((item) => item.actionType), ["preserve-and-monitor", "preserve-and-monitor"]);
});

test("MSE-25.118e prioritises provisioning before SEO when the agency has no mini-site", () => {
  const result = buildLocalSearchRemediation({
    agencyKey: "maurepas",
    measurement: { assessment: { status: "low-volume", confidence: "low" } },
    publication: { state: "no-site" },
  });

  assert.equal(result.publicationState, "no-site");
  assert.equal(result.actionType, "site-provisioning-check");
  assert.equal(result.recommendation, "provision-mini-site-before-seo-remediation");
});

test("MSE-25.118e prioritises publication before SEO for a draft mini-site", () => {
  const result = buildLocalSearchRemediation({
    agencyKey: "lamorlaye",
    measurement: { assessment: { status: "no-data", confidence: "none" } },
    publication: { site: { status: "draft", publishedAt: null } },
  });

  assert.equal(result.publicationState, "unpublished");
  assert.equal(result.actionType, "site-publication-check");
  assert.equal(result.recommendation, "publish-or-confirm-intent-before-seo-remediation");
});

test("MSE-25.118e keeps existing SEO remediation when the mini-site is published", () => {
  const result = buildLocalSearchRemediation({
    agencyKey: "dax",
    measurement: { assessment: { status: "visibility-no-clicks", confidence: "usable" } },
    publication: { site: { status: "published", publishedAt: "2026-09-01T00:00:00.000Z" } },
  });

  assert.equal(result.publicationState, "published");
  assert.equal(result.actionType, "serp-snippet-review");
});

test("MSE-25.118e treats publishedAt as authoritative for sitemap-compatible publication", () => {
  const result = buildLocalSearchRemediation({
    agencyKey: "ozoir",
    measurement: null,
    publication: { site: { status: "draft", publishedAt: "2026-08-01T00:00:00.000Z" } },
  });

  assert.equal(result.publicationState, "published");
  assert.equal(result.actionType, "indexation-and-intent-check");
});

test("MSE-25.118c never authorizes doorway pages or automatic public/Google writes", () => {
  const result = buildLocalSearchRemediation({ agencyKey: "dax", measurement: { assessment: { status: "weak-position", confidence: "usable" } } });
  assert.equal(result.createDoorwayPageAllowed, false);
  assert.equal(result.automatedPublicChangeAllowed, false);
  assert.equal(result.googleWriteAllowed, false);
  assert.equal(result.requiresHumanReview, true);
  assert.ok(result.allowedSurfaces.includes("home"));
  assert.ok(result.allowedSurfaces.includes("published-cms"));
});
