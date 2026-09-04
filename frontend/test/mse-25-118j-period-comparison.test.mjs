import assert from "node:assert/strict";
import test from "node:test";
import { localSearchPeriodDays, compareLocalSearchPeriods } from "../lib/seo/local-search-period-comparison.js";
import { compareLocalSearchSnapshots } from "../lib/seo/local-search-network-measurement.js";

test("MSE-25.118j accepts equal-duration periods as comparable", () => {
  const baseline = { start: "2026-07-01", end: "2026-07-30" };
  const current = { start: "2026-08-01", end: "2026-08-30" };
  const comparison = compareLocalSearchPeriods(baseline, current);

  assert.equal(localSearchPeriodDays(baseline), 30);
  assert.equal(comparison.status, "comparable");
  assert.equal(comparison.comparable, true);
  assert.equal(comparison.baselineDays, 30);
  assert.equal(comparison.currentDays, 30);
});

test("MSE-25.118j rejects different-duration periods and invalid periods", () => {
  const mismatch = compareLocalSearchPeriods(
    { start: "2026-07-01", end: "2026-07-30" },
    { start: "2026-08-01", end: "2026-08-07" },
  );
  assert.equal(mismatch.status, "not-comparable");
  assert.equal(mismatch.comparable, false);
  assert.equal(mismatch.baselineDays, 30);
  assert.equal(mismatch.currentDays, 7);

  const unknown = compareLocalSearchPeriods(
    { start: "2026-07-01", end: "2026-07-30" },
    { start: "invalid", end: "2026-08-30" },
  );
  assert.equal(unknown.status, "unknown");
  assert.equal(unknown.comparable, false);
});

test("MSE-25.118j suppresses metric deltas and trends for non-comparable snapshots", () => {
  const baseline = {
    period: { start: "2026-07-01", end: "2026-07-30" },
    agencies: [{ agencyKey: "dax", current: { impressions: 30, clicks: 0, position: 12 } }],
  };
  const current = {
    period: { start: "2026-08-01", end: "2026-08-07" },
    agencies: [{ agencyKey: "dax", current: { impressions: 40, clicks: 2, position: 8 } }],
  };

  const [measurement] = compareLocalSearchSnapshots({ baseline, current });
  assert.equal(measurement.periodComparison.status, "not-comparable");
  assert.equal(measurement.assessment.trend, "not-comparable");
  assert.equal(measurement.assessment.comparison, null);
  assert.notEqual(measurement.assessment.status, "improving");
});

test("MSE-25.118j allows performance trends for comparable snapshots", () => {
  const baseline = {
    period: { start: "2026-07-01", end: "2026-07-30" },
    agencies: [{ agencyKey: "dax", current: { impressions: 30, clicks: 1, position: 12 } }],
  };
  const current = {
    period: { start: "2026-08-01", end: "2026-08-30" },
    agencies: [{ agencyKey: "dax", current: { impressions: 40, clicks: 3, position: 8 } }],
  };

  const [measurement] = compareLocalSearchSnapshots({ baseline, current });
  assert.equal(measurement.periodComparison.status, "comparable");
  assert.equal(measurement.assessment.trend, "improving");
  assert.equal(measurement.assessment.status, "improving");
  assert.notEqual(measurement.assessment.comparison, null);
});
