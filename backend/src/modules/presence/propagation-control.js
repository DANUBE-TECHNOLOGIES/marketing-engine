"use strict";

function buildPropagationControlPlan(rows = [], options = {}) {
  const maxVerifications = Math.max(1, Math.min(Number(options.maxVerifications || 25), 100));
  const verifyStates = new Set(options.verifyStates || ["slow", "stale"]);
  const verificationQueue = [];
  const escalations = [];

  for (const row of rows) {
    const state = row?.propagation?.state || "unknown";
    if (state === "stale") {
      escalations.push(Object.freeze({
        agencyId: row.agencyId,
        agencyName: row.agencyName,
        listingId: row.listingId,
        providerKey: "google_business_profile",
        reason: "propagation_stale",
        ageMs: row.propagation.ageMs,
        listingUrl: row.listingUrl || null
      }));
    }
    if (verifyStates.has(state) && verificationQueue.length < maxVerifications) {
      verificationQueue.push(Object.freeze({
        agencyId: row.agencyId,
        agencyName: row.agencyName,
        listingId: row.listingId,
        providerKey: "google_business_profile",
        state,
        ageMs: row.propagation.ageMs
      }));
    }
  }

  return Object.freeze({
    totalPending: rows.length,
    plannedVerifications: verificationQueue.length,
    escalations: escalations.length,
    maxVerifications,
    verificationQueue: Object.freeze(verificationQueue),
    escalationQueue: Object.freeze(escalations)
  });
}

module.exports = { buildPropagationControlPlan };
