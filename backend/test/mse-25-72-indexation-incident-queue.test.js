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

test("MSE-25.72 consumes the real MSE-25.69 network sites/pages contract", () => {
  const queue = buildIndexationIncidentQueue({
    coverage: {
      sites: [
        {
          siteId: "site-dax", siteSlug: "dax", agencyId: "agency-dax", agencyName: "Dax",
          pages: [{ pageId: "p1", pageSlug: "billetterie", url: "https://agences.mondescale.com/agence/dax/billetterie", reason: "MISSING_FROM_SITEMAP", inSitemap: false, indexableByLocalContract: true }],
        },
        {
          siteId: "site-gien", siteSlug: "gien", agencyId: "agency-gien", agencyName: "Gien",
          pages: [
            { pageId: "p2", pageSlug: "circuits", url: "https://agences.mondescale.com/agence/gien/circuits", reason: "NOT_INDEXABLE", inSitemap: true, indexableByLocalContract: false },
            { pageId: "p3", pageSlug: "agence", url: "https://agences.mondescale.com/agence/gien/agence", reason: "CANONICAL_MISMATCH", declaredCanonical: "https://agences.mondescale.com/agence/gien", canonicalMatchesPublicUrl: false },
          ],
        },
      ],
    },
  });
  assert.deepEqual(queue.incidents.map((item) => item.code), ["SITEMAP_MISSING", "LOCAL_NOINDEX", "CANONICAL_CONTRACT_MISMATCH"]);
  assert.equal(queue.summary.p0Count, 2);
  assert.equal(queue.summary.p1Count, 1);
  assert.equal(queue.incidents[0].agencySiteId, "site-dax");
  assert.equal(queue.incidents[0].agencyName, "Dax");
  assert.ok(queue.incidents.every((item) => item.autoRemediationEligible === false));
});

test("MSE-25.72 ignores healthy coverage and Search Console waiting states", () => {
  const queue = buildIndexationIncidentQueue({
    coverage: { sites: [{ siteId: "site-dax", siteSlug: "dax", pages: [{ url: "https://agences.mondescale.com/agence/dax", reason: "SITEMAP_EXPOSED_WAITING_FOR_GOOGLE" }] }] },
    publicAudit: { observations: [{ expectedUrl: "https://agences.mondescale.com/agence/dax", reason: "PUBLIC_INDEXABILITY_OK", status: 200 }] },
  });
  assert.equal(queue.summary.incidentCount, 0);
  assert.deepEqual(queue.incidents, []);
});
