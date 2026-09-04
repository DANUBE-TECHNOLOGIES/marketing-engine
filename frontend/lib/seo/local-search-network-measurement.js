import { buildAgencyLocalSearchMeasurement } from "./local-search-measurement.js";
import { compareLocalSearchPeriods } from "./local-search-period-comparison.js";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function buildLocalSearchSnapshot({ capturedAt = null, period = null, agencies = [] } = {}) {
  const items = agencies.map((item) => buildAgencyLocalSearchMeasurement({
    agencyKey: item?.agencyKey ?? null,
    baseline: item?.baseline ?? null,
    current: item?.current ?? null,
    period: item?.period ?? period,
  }));

  const totals = items.reduce((acc, item) => {
    acc.impressions += finite(item.current?.impressions);
    acc.clicks += finite(item.current?.clicks);
    return acc;
  }, { impressions: 0, clicks: 0 });

  return {
    capturedAt,
    period,
    agencies: items,
    totals,
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
  };
}

export function compareLocalSearchSnapshots({ baseline = null, current = null } = {}) {
  const baselineByAgency = new Map((baseline?.agencies || []).map((item) => [item.agencyKey, item]));
  const currentAgencies = current?.agencies || [];

  return currentAgencies.map((item) => {
    const previous = baselineByAgency.get(item.agencyKey) || null;
    const baselineRow = previous?.current ?? previous?.baseline ?? null;
    const baselinePeriod = previous?.period ?? baseline?.period ?? null;
    const currentPeriod = item?.period ?? current?.period ?? null;
    const periodComparison = compareLocalSearchPeriods(baselinePeriod, currentPeriod);

    return buildAgencyLocalSearchMeasurement({
      agencyKey: item.agencyKey,
      baseline: baselineRow,
      current: item.current,
      period: currentPeriod,
      periodComparison,
      comparisonAllowed: periodComparison.comparable,
    });
  });
}

export function buildLocalSearchNetworkReport({ baselineSnapshot = null, currentSnapshot = null } = {}) {
  const agencies = baselineSnapshot
    ? compareLocalSearchSnapshots({ baseline: baselineSnapshot, current: currentSnapshot })
    : (currentSnapshot?.agencies || []);

  const statusCounts = agencies.reduce((acc, item) => {
    const status = item.assessment?.status || "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const actionable = agencies
    .filter((item) => item.assessment?.confidence === "usable" && !["healthy", "improving"].includes(item.assessment?.status))
    .map((item) => ({
      agencyKey: item.agencyKey,
      status: item.assessment.status,
      recommendation: item.assessment.recommendation,
      current: item.current,
    }));

  return {
    period: currentSnapshot?.period ?? null,
    capturedAt: currentSnapshot?.capturedAt ?? null,
    totals: currentSnapshot?.totals ?? { impressions: 0, clicks: 0 },
    agencies,
    statusCounts,
    actionable,
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
  };
}
