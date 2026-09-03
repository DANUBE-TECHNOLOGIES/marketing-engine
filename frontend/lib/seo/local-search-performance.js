import { searchConsoleCtr } from "./search-console-local-baseline.js";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function compareLocalSearchPerformance({ baseline, current }) {
  const baselineImpressions = finite(baseline?.impressions) ?? 0;
  const currentImpressions = finite(current?.impressions) ?? 0;
  const baselineClicks = finite(baseline?.clicks) ?? 0;
  const currentClicks = finite(current?.clicks) ?? 0;
  const baselinePosition = finite(baseline?.position);
  const currentPosition = finite(current?.position);

  return {
    impressionsDelta: currentImpressions - baselineImpressions,
    clicksDelta: currentClicks - baselineClicks,
    ctrDelta:
      searchConsoleCtr({ clicks: currentClicks, impressions: currentImpressions }) -
      searchConsoleCtr({ clicks: baselineClicks, impressions: baselineImpressions }),
    positionDelta:
      baselinePosition != null && currentPosition != null
        ? baselinePosition - currentPosition
        : null,
  };
}

export function localSearchPerformanceStatus(comparison) {
  if (!comparison) return "unknown";
  if (comparison.clicksDelta > 0 || comparison.positionDelta > 0) return "improving";
  if (comparison.impressionsDelta > 0 && comparison.ctrDelta >= 0) return "gaining-visibility";
  if (comparison.impressionsDelta < 0 || comparison.positionDelta < 0) return "declining";
  return "stable";
}
