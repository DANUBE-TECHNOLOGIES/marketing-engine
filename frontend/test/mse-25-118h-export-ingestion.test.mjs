import assert from "node:assert/strict";
import test from "node:test";
import { buildLocalSearchSnapshotFromSearchConsoleExport } from "../lib/seo/local-search-export-ingestion.js";

const agencies = [
  { agencyKey: "dax", city: "Dax" },
  { agencyKey: "maurepas", city: "Maurepas" },
  { agencyKey: "lamorlaye", city: "Lamorlaye" },
];

test("MSE-25.118h turns raw Search Console rows into a network snapshot", () => {
  const rows = [
    { query: "agence de voyage dax", page: "/agence/dax", clicks: 0, impressions: 64, ctr: 0, position: 8.4 },
    { query: "agence de voyage maurepas", page: "/agence/maurepas", clicks: 0, impressions: 3, ctr: 0, position: 18.2 },
    { query: "voyage grece", page: "/inspirations/grece", clicks: 2, impressions: 80, ctr: 0.025, position: 10.2 },
  ];

  const result = buildLocalSearchSnapshotFromSearchConsoleExport({
    rows,
    agencies,
    capturedAt: "2026-09-04T08:15:00.000Z",
    period: { start: "2026-08-01", end: "2026-08-31" },
  });

  const byAgency = new Map(result.snapshot.agencies.map((item) => [item.agencyKey, item]));
  assert.equal(byAgency.get("dax").assessment.status, "visibility-no-clicks");
  assert.equal(byAgency.get("maurepas").assessment.status, "low-volume");
  assert.equal(byAgency.get("lamorlaye").assessment.status, "no-impressions");
  assert.equal(result.attributionAudit.unmapped.length, 1);
  assert.equal(result.automatedPublicChangeAllowed, false);
  assert.equal(result.googleWriteAllowed, false);
});
