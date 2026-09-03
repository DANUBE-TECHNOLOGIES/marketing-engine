"use strict";

const { fingerprint } = require("./search-demand-evidence");

function classifyHistoryTrend(history = {}) {
  const latest = history.latest || null;
  const previous = history.previous || null;
  if (!latest) return "NO_HISTORY";
  if (latest.dataState === "NO_DATA_YET") return "WAITING_FOR_DATA";
  if (!previous || previous.dataState === "NO_DATA_YET") return "DATA_APPEARED";
  if ((history.change?.humanReviewEligibleDelta || 0) > 0) return "REVIEW_QUEUE_GROWING";
  if ((history.change?.humanReviewEligibleDelta || 0) < 0) return "REVIEW_QUEUE_SHRINKING";
  if ((history.change?.analyticsRowDelta || 0) !== 0) return "DEMAND_ACTIVITY_CHANGED";
  return "STABLE";
}

function buildHistoryTrendReport({ history } = {}) {
  if (!history || history.readOnly !== true || history.writes !== false || history.policy?.automaticWrites !== false) {
    const error = new Error("MSE-25.50 trend analysis requires a safe read-only history.");
    error.code = "MSE_25_50_UNSAFE_HISTORY";
    throw error;
  }
  const result = {
    type: "mse-25.50-search-demand-history-trend",
    sourceHistoryFingerprint: history.historyFingerprint || null,
    trend: classifyHistoryTrend(history),
    snapshotCount: Number(history.snapshotCount || 0),
    latest: history.latest || null,
    previous: history.previous || null,
    change: history.change || null,
    readOnly: true,
    writes: false,
    destructive: false,
    reviewRequired: Number(history.latest?.humanReviewEligibleCount || 0) > 0,
    policy: {
      trendIsObservationOnly: true,
      humanReviewRequiredBeforeSeoExecution: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
  };
  return { ...result, trendFingerprint: fingerprint(result) };
}

module.exports = { classifyHistoryTrend, buildHistoryTrendReport };
