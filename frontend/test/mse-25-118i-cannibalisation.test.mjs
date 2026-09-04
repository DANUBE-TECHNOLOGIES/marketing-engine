import assert from "node:assert/strict";
import test from "node:test";
import { detectObservedLocalSearchCannibalisation } from "../lib/seo/local-search-cannibalisation.js";
import { buildLocalSearchSnapshotFromSearchConsoleExport } from "../lib/seo/local-search-export-ingestion.js";
import { buildLocalSearchRemediation } from "../lib/seo/local-search-remediation.js";

const attributed = (page, impressions) => ({
  query: "agence de voyage dax",
  page,
  agencyKey: "dax",
  attribution: "attributed",
  clicks: 0,
  impressions,
  position: 8,
});

test("MSE-25.118i detects meaningful multi-page Search Console cannibalisation", () => {
  const conflicts = detectObservedLocalSearchCannibalisation([
    attributed("/agence/dax", 35),
    attributed("/agence/dax/services", 29),
  ]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].agencyKey, "dax");
  assert.equal(conflicts[0].impressions, 64);
  assert.equal(conflicts[0].significantPageCount, 2);
  assert.equal(conflicts[0].pages[0].share > 0.5, true);
});

test("MSE-25.118i ignores a marginal secondary page and low-volume noise", () => {
  const dominant = detectObservedLocalSearchCannibalisation([
    attributed("/agence/dax", 55),
    attributed("/agence/dax/services", 9),
  ]);
  assert.equal(dominant.length, 0);

  const lowVolume = detectObservedLocalSearchCannibalisation([
    attributed("/agence/dax", 6),
    attributed("/agence/dax/services", 4),
  ]);
  assert.equal(lowVolume.length, 0);
});

test("MSE-25.118i propagates cannibalisation into measurement and remediation", () => {
  const result = buildLocalSearchSnapshotFromSearchConsoleExport({
    rows: [
      { query: "agence de voyage dax", page: "/agence/dax", clicks: 1, impressions: 35, position: 7.8 },
      { query: "agence de voyage dax", page: "/agence/dax/services", clicks: 1, impressions: 29, position: 9.1 },
    ],
    agencies: [{ agencyKey: "dax", city: "Dax" }],
    capturedAt: "2026-09-04T08:30:00.000Z",
    period: { start: "2026-08-01", end: "2026-08-31" },
  });

  const measurement = result.snapshot.agencies[0];
  assert.equal(measurement.assessment.status, "cannibalization");
  assert.equal(measurement.assessment.recommendation, "consolidate-existing-page-intent");
  assert.equal(result.cannibalisation.length, 1);

  const remediation = buildLocalSearchRemediation({
    agencyKey: "dax",
    measurement,
    publication: { status: "published" },
  });
  assert.equal(remediation.actionType, "query-page-consolidation");
  assert.equal(remediation.createDoorwayPageAllowed, false);
  assert.equal(remediation.automatedPublicChangeAllowed, false);
  assert.equal(remediation.googleWriteAllowed, false);
});
