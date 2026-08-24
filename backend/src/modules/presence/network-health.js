"use strict";

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function buildNetworkHealth({ coverage, anomalyCount = 0, propagationAlerts = [] } = {}) {
  const coveragePercent = clamp(coverage?.summary?.coveragePercent || 0);
  const totalCells = Number(coverage?.summary?.total || 0);
  const anomalyRatio = totalCells ? Math.min(1, Number(anomalyCount || 0) / totalCells) : 0;
  const critical = propagationAlerts.filter((item) => item.severity === "critical").length;
  const stale = propagationAlerts.filter((item) => item.severity === "stale").length;
  const slow = propagationAlerts.filter((item) => item.severity === "slow").length;
  const anomalyPenalty = Math.round(anomalyRatio * 35);
  const propagationPenalty = Math.min(30, critical * 12 + stale * 7 + slow * 3);
  const score = clamp(coveragePercent - anomalyPenalty - propagationPenalty);
  const grade = score >= 90 ? "excellent" : score >= 75 ? "good" : score >= 55 ? "watch" : "critical";

  return Object.freeze({
    score,
    grade,
    coveragePercent,
    anomalyCount: Number(anomalyCount || 0),
    propagation: Object.freeze({ slow, stale, critical }),
    penalties: Object.freeze({ anomaly: anomalyPenalty, propagation: propagationPenalty })
  });
}

module.exports = { buildNetworkHealth, clamp };
