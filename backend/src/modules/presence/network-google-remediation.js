"use strict";

const { buildAnomalyQueue } = require("./anomaly-queue");
const { remediationRisk } = require("./google-remediation");

function clampLimit(value, fallback = 10) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(Math.floor(parsed), 50));
}

function buildGoogleRemediationRunPlan(agencies, directories, listings, options = {}) {
  const limit = clampLimit(options.limit, 10);
  const includeSensitive = options.includeSensitive === true;
  const queue = buildAnomalyQueue(agencies, directories, listings)
    .filter((item) => item.providerKey === "google_business_profile")
    .filter((item) => item.status !== "validated")
    .filter((item) => item.drift.some((field) => ["name", "address", "phone", "website"].includes(field)));

  const items = [];
  let skippedSensitive = 0;
  for (const item of queue) {
    const drift = item.drift.filter((field) => ["name", "address", "phone", "website"].includes(field));
    const risk = remediationRisk(drift);
    if (risk.requiresSensitiveConfirmation && !includeSensitive) {
      skippedSensitive += 1;
      continue;
    }
    if (items.length >= limit) break;
    items.push(Object.freeze({
      agencyId: item.agencyId,
      agencyName: item.agencyName,
      listingId: item.listingId,
      drift: Object.freeze(drift),
      risk,
      priorityScore: item.score
    }));
  }

  return Object.freeze({
    totalGoogleAnomalies: queue.length,
    planned: items.length,
    skippedSensitive,
    limit,
    includeSensitive,
    items: Object.freeze(items)
  });
}

module.exports = { buildGoogleRemediationRunPlan, clampLimit };
