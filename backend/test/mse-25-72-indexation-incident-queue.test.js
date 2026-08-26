"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildIndexationIncidentQueue } = require("../src/modules/search-console-submission/indexation-incident-queue");

test("MSE-25.72 classifies blocking runtime incidents without remediation", () => {
  const queue = buildIndexationIncidentQueue({
    publicAudit: {
      observations: [
        { expectedUrl: "https://agences.mondescale.com/agence/dax", reason: "PUBLIC_HTTP_ERROR", status: 404 },
        { expectedUrl: "https://agences.mondescale.com/agence/gien", reason: "PUBLIC_CANONICAL_MISMATCH", status: 200, publicCanonical: "https://agences.mondescale.com/agence/other" },
        { expectedUrl: "https://agences.mondescale.com/agence/nevers", reason: "PUBLIC_FETCH_UNAVAILABLE", fetchError: "timeout" },
        { expectedUrl: "https://agences.mondescale.com/agence/maurepas", reason: "PUBLIC_INDEXABILITY_OK", status: 200 },
      ],
    },
  });

  assert.equal(queue.version, "mse-25.72");
  assert.equal(queue.summary.incidentCount, 3);
  assert.equal(queue.summary.blockingCount, 2);
  assert.equal(queue.summary.p0Count, 1);
  assert.equal(queue.summary.p1Count, 1);
  assert.equal(queue.summary.p3Count, 1);
  assert.equal(queue.summary.autoRemediationEligibleCount, 0);
  assert.equal(queue.incidents[0].code, "HTTP_ERROR");
  assert.equal(queue.incidents[0].requiresHumanReview, true);
  assert.equal(queue.invariants.googleWrites, false);
  assert.equal(queue.invariants.automaticRemediation, false);
});

test("MSE-25.72 converts local coverage failures into deterministic incidents", () => {
  const queue = buildIndexationIncidentQueue({
    coverage: {
      pages: [
        { url: "https://agences.mondescale.com/agence/dax/billetterie", siteSlug: "dax", reason: "PAGE_NOT_IN_SITEMAP", inSitemap: false, indexable: true },
        { url: "https://agences.mondescale.com/agence/gien/circuits", siteSlug: "gien", reasons: ["PAGE_NOT_INDEXABLE", "CANONICAL_MISMATCH"], inSitemap: true, indexable: false },
      ],
    },
  });

  assert.deepEqual(queue.incidents.map((item) => item.code), ["SITEMAP_MISSING", "LOCAL_NOINDEX", "CANONICAL_CONTRACT_MISMATCH"]);
  assert.equal(queue.summary.p0Count, 2);
  assert.equal(queue.summary.p1Count, 1);
  assert.ok(queue.incidents.every((item) => item.autoRemediationEligible === false));
});

test("MSE-25.72 remains empty when observations are healthy", () => {
  const queue = buildIndexationIncidentQueue({ publicAudit: { observations: [{ expectedUrl: "https://agences.mondescale.com/agence/dax", reason: "PUBLIC_INDEXABILITY_OK", status: 200 }] } });
  assert.equal(queue.summary.incidentCount, 0);
  assert.deepEqual(queue.incidents, []);
});
