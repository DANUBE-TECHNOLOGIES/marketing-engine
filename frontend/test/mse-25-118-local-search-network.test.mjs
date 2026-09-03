import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLocalSearchSnapshot,
  buildLocalSearchNetworkReport,
} from "../lib/seo/local-search-network-measurement.js";

test("MSE-25.118b aggregates deterministic agency snapshots", () => {
  const snapshot = buildLocalSearchSnapshot({
    capturedAt: "2026-09-03T18:30:00Z",
    period: "2026-08-01/2026-08-31",
    agencies: [
      { agencyKey: "dax", current: { impressions: 64, clicks: 0, position: 8 } },
      { agencyKey: "gien", current: { impressions: 10, clicks: 1, position: 7 } },
    ],
  });

  assert.equal(snapshot.totals.impressions, 74);
  assert.equal(snapshot.totals.clicks, 1);
  assert.equal(snapshot.agencies.length, 2);
  assert.equal(snapshot.automatedPublicChangeAllowed, false);
  assert.equal(snapshot.googleWriteAllowed, false);
});

test("MSE-25.118b compares snapshots and only surfaces usable actionable cases", () => {
  const baselineSnapshot = buildLocalSearchSnapshot({
    period: "baseline",
    agencies: [
      { agencyKey: "dax", current: { impressions: 40, clicks: 0, position: 10 } },
      { agencyKey: "gien", current: { impressions: 8, clicks: 1, position: 8 } },
    ],
  });

  const currentSnapshot = buildLocalSearchSnapshot({
    period: "current",
    agencies: [
      { agencyKey: "dax", current: { impressions: 64, clicks: 0, position: 8 } },
      { agencyKey: "gien", current: { impressions: 10, clicks: 1, position: 7 } },
    ],
  });

  const report = buildLocalSearchNetworkReport({ baselineSnapshot, currentSnapshot });

  assert.equal(report.agencies.length, 2);
  assert.equal(report.agencies.find((item) => item.agencyKey === "dax")?.assessment.status, "visibility-no-clicks");
  assert.equal(report.agencies.find((item) => item.agencyKey === "gien")?.assessment.status, "low-volume");
  assert.deepEqual(report.actionable.map((item) => item.agencyKey), ["dax"]);
  assert.equal(report.googleWriteAllowed, false);
});
