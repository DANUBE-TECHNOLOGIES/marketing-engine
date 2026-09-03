"use strict";

const { fingerprint } = require("./search-demand-evidence");

function buildSearchDemandHistory({ observations = [] } = {}) {
  const safe = observations.filter((item) => item && item.readOnly === true && item.writes === false && item.certified === true);
  const ordered = [...safe].sort((a, b) => String(a.generatedAt || "").localeCompare(String(b.generatedAt || "")));

  const snapshots = ordered.map((item, index) => ({
    ordinal: index + 1,
    generatedAt: item.generatedAt || null,
    observationFingerprint: item.observationFingerprint || null,
    analyticsFingerprint: item.analyticsFingerprint || null,
    lifecycleFingerprint: item.lifecycleFingerprint || null,
    property: item.property || null,
    dataState: item.dataState || null,
    lifecycleState: item.lifecycleState || null,
    analyticsRowCount: Number(item.analyticsRowCount || 0),
    humanReviewEligibleCount: Number(item.summary?.humanReviewEligibleCount || 0),
    automaticWriteCount: Number(item.summary?.automaticWriteCount || 0),
  }));

  const latest = snapshots.at(-1) || null;
  const previous = snapshots.at(-2) || null;
  const result = {
    type: "mse-25.50-search-demand-history",
    readOnly: true,
    writes: false,
    destructive: false,
    noDataIsNotNoDemand: true,
    snapshotCount: snapshots.length,
    snapshots,
    latest,
    previous,
    change: latest && previous ? {
      dataStateChanged: latest.dataState !== previous.dataState,
      lifecycleStateChanged: latest.lifecycleState !== previous.lifecycleState,
      analyticsRowDelta: latest.analyticsRowCount - previous.analyticsRowCount,
      humanReviewEligibleDelta: latest.humanReviewEligibleCount - previous.humanReviewEligibleCount,
    } : null,
    policy: {
      certifiedObservationsOnly: true,
      appendOnlyEvidence: true,
      humanReviewRequired: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
  };

  return { ...result, historyFingerprint: fingerprint(result) };
}

module.exports = { buildSearchDemandHistory };
