import { compareLocalSearchPerformance, localSearchPerformanceStatus } from "./local-search-performance.js";
import { searchConsoleCtr } from "./search-console-local-baseline.js";

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export const LOCAL_SEARCH_MEASUREMENT_THRESHOLDS = Object.freeze({
  minimumImpressionsForCtrJudgement: 20,
  lowCtr: 0.02,
  weakAveragePosition: 12,
});

export function localSearchMeasurementConfidence(row, thresholds = LOCAL_SEARCH_MEASUREMENT_THRESHOLDS) {
  const impressions = finite(row?.impressions) ?? 0;
  if (impressions <= 0) return "none";
  if (impressions < thresholds.minimumImpressionsForCtrJudgement) return "low";
  return "usable";
}

export function classifyLocalSearchMeasurement({ baseline = null, current = null, thresholds = LOCAL_SEARCH_MEASUREMENT_THRESHOLDS } = {}) {
  if (!current) return { status: "no-data", confidence: "none", recommendation: "collect-data" };

  const impressions = finite(current.impressions) ?? 0;
  const clicks = finite(current.clicks) ?? 0;
  const position = finite(current.position);
  const ctr = searchConsoleCtr({ clicks, impressions });
  const confidence = localSearchMeasurementConfidence(current, thresholds);
  const comparison = baseline ? compareLocalSearchPerformance({ baseline, current }) : null;
  const trend = comparison ? localSearchPerformanceStatus(comparison) : "unknown";

  if (impressions === 0) {
    return { status: "no-impressions", confidence, ctr, position, trend, comparison, recommendation: "verify-indexation-and-query-target" };
  }
  if (confidence === "low") {
    return { status: "low-volume", confidence, ctr, position, trend, comparison, recommendation: "collect-more-data" };
  }
  if (clicks === 0) {
    return { status: "visibility-no-clicks", confidence, ctr, position, trend, comparison, recommendation: "review-serp-snippet-and-position" };
  }
  if (position != null && position > thresholds.weakAveragePosition) {
    return { status: "weak-position", confidence, ctr, position, trend, comparison, recommendation: "strengthen-existing-page-relevance" };
  }
  if (ctr < thresholds.lowCtr) {
    return { status: "low-ctr", confidence, ctr, position, trend, comparison, recommendation: "review-serp-snippet" };
  }
  if (trend === "improving" || trend === "gaining-visibility") {
    return { status: "improving", confidence, ctr, position, trend, comparison, recommendation: "preserve-and-monitor" };
  }
  return { status: "healthy", confidence, ctr, position, trend, comparison, recommendation: "monitor" };
}

export function buildAgencyLocalSearchMeasurement({ agencyKey = null, baseline = null, current = null, period = null } = {}) {
  return {
    agencyKey,
    period,
    baseline,
    current,
    assessment: classifyLocalSearchMeasurement({ baseline, current }),
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
  };
}
