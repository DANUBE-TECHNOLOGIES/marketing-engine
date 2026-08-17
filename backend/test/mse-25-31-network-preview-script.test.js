"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertSafePreview,
  isSafePreview,
  normalizeOrigin,
  operatorOutput,
  positiveInteger,
  run,
} = require("../scripts/mse-25-31-network-preview");

test("network preview command normalizes origin and positive limits", () => {
  assert.equal(normalizeOrigin("http://127.0.0.1:4000///"), "http://127.0.0.1:4000");
  assert.equal(positiveInteger("5", 20), 5);
  assert.equal(positiveInteger("0", 20), 20);
  assert.equal(positiveInteger("bad", 20), 20);
});

test("operator output preserves read-only safety and ranking", () => {
  const payload = {
    version: "mse-25.31",
    operation: "preview-network-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    planFingerprint: "abc123",
    minimumWords: 120,
    summary: { pageActionCount: 2 },
    excludedSites: [{ siteSlug: "draft" }],
    operatorReport: {
      summary: { pageCount: 2, simulationReadyCount: 1, manualReviewNeededCount: 1 },
      rows: [
        { siteSlug: "gien", pageSlug: "avis", priority: "high", priorityScore: 72, projectedReduction: 2, executionClass: "simulation-ready", operationTypes: ["enrich-body"] },
        { siteSlug: "gien", pageSlug: "services", priority: "medium", priorityScore: 42, projectedReduction: 1, executionClass: "manual-review-needed", operationTypes: ["strengthen-meta-description"], manualReviewReasons: ["strengthen-meta-description"] },
      ],
      manualReviewNeeded: [
        { siteSlug: "gien", pageSlug: "services", priority: "medium", priorityScore: 42, projectedReduction: 1, executionClass: "manual-review-needed", operationTypes: ["strengthen-meta-description"], manualReviewReasons: ["strengthen-meta-description"] },
      ],
    },
  };

  assert.equal(isSafePreview(payload), true);
  assert.equal(assertSafePreview(payload), payload);
  const result = operatorOutput(payload, { topPages: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.planFingerprint, "abc123");
  assert.equal(result.topPages.length, 1);
  assert.equal(result.topPages[0].pageSlug, "avis");
  assert.equal(result.manualReviewNeeded[0].pageSlug, "services");
  assert.equal(result.allPages, undefined);

  const archival = operatorOutput(payload, { topPages: 1, includeAllPages: true });
  assert.equal(archival.topPages.length, 1);
  assert.equal(archival.allPages.length, 2);
  assert.deepEqual(archival.allPages.map((row) => row.pageSlug), ["avis", "services"]);
});

test("network preview command fails closed on unsafe payload", () => {
  const unsafe = { readOnly: false, writes: true, destructive: false, operatorReport: { rows: [] } };
  const result = operatorOutput(unsafe);
  assert.equal(result.ok, false);
  assert.equal(isSafePreview(unsafe), false);
  assert.throws(
    () => assertSafePreview(unsafe),
    (error) => error.code === "MSE_25_31_UNSAFE_PREVIEW_PAYLOAD"
  );
});

test("destructive payload is also unsafe even when writes is false", () => {
  assert.equal(isSafePreview({ readOnly: true, writes: false, destructive: true }), false);
});

test("run posts only to the read-only quality uplift preview route", async (t) => {
  const calls = [];
  const originalFetch = global.fetch;
  t.after(() => { global.fetch = originalFetch; });
  global.fetch = async (url, options) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        version: "mse-25.31",
        operation: "preview-network-quality-uplift",
        readOnly: true,
        writes: false,
        destructive: false,
        planFingerprint: "safe-plan",
        minimumWords: 140,
        summary: {},
        excludedSites: [],
        operatorReport: {
          summary: { pageCount: 1 },
          rows: [{ siteSlug: "gien", pageSlug: "avis", priority: "high" }],
          manualReviewNeeded: [],
        },
      }),
    };
  };

  const result = await run({
    backendOrigin: "http://127.0.0.1:4000/",
    tenantSlug: "mondescale",
    minimumWords: 140,
    includeAllPages: true,
    emitOutput: false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.allPages.length, 1);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "http://127.0.0.1:4000/minisite-seo-enrichment/network/quality-uplift/preview");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers["x-tenant-slug"], "mondescale");
  assert.deepEqual(JSON.parse(calls[0].options.body), { minimumWords: 140 });
});
