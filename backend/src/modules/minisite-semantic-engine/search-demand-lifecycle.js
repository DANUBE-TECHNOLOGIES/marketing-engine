"use strict";

const { fingerprint } = require("./search-demand-evidence");

const ACTIVE = new Set(["weak", "medium", "high"]);
const REVIEW_QUALIFYING = new Set(["medium", "high"]);
const MIN_QUALIFYING_SNAPSHOTS = 2;

function signalKey(signal = {}) {
  return [signal.siteSlug || "", signal.intentKey || ""].join("::");
}

function classifyTransition(previous, current, { currentDataAvailable }) {
  if (!currentDataAvailable) return "UNKNOWN_NO_DATA";
  if (!previous) return ACTIVE.has(current.evidenceStrength) ? "NEW" : "UNOBSERVED";
  const wasActive = ACTIVE.has(previous.evidenceStrength);
  const isActive = ACTIVE.has(current.evidenceStrength);
  if (!wasActive && isActive) return "NEW";
  if (wasActive && isActive) return "PERSISTING";
  if (wasActive && !isActive) return "DISAPPEARED";
  return "UNOBSERVED";
}

function qualifyingPersistence(previous, current, { currentDataAvailable }) {
  if (!currentDataAvailable || !REVIEW_QUALIFYING.has(current?.evidenceStrength)) return 0;
  return REVIEW_QUALIFYING.has(previous?.evidenceStrength) ? 2 : 1;
}

function buildSearchDemandLifecycle({ previous = null, current } = {}) {
  if (!current || current.readOnly !== true || current.writes !== false || current.policy?.automaticWrites !== false) {
    const error = new Error("Search demand lifecycle requires a safe MSE-25.48 evidence snapshot.");
    error.code = "MSE_25_49_UNSAFE_CURRENT_EVIDENCE";
    throw error;
  }
  if (previous && (previous.readOnly !== true || previous.writes !== false)) {
    const error = new Error("Previous search demand snapshot is unsafe.");
    error.code = "MSE_25_49_UNSAFE_PREVIOUS_EVIDENCE";
    throw error;
  }

  const previousSignals = new Map((previous?.signals || []).map((signal) => [signalKey(signal), signal]));
  const currentDataAvailable = current.analyticsAvailable === true;
  const signals = (current.signals || []).map((signal) => {
    const prior = previousSignals.get(signalKey(signal)) || null;
    const transition = classifyTransition(prior, signal, { currentDataAvailable });
    const qualifyingSnapshotCount = qualifyingPersistence(prior, signal, { currentDataAvailable });
    const persistentReviewEvidence = qualifyingSnapshotCount >= MIN_QUALIFYING_SNAPSHOTS;
    return {
      siteSlug: signal.siteSlug,
      agencyId: signal.agencyId,
      city: signal.city,
      intentKey: signal.intentKey,
      previousEvidenceStrength: prior?.evidenceStrength || null,
      evidenceStrength: signal.evidenceStrength,
      transition,
      clicks: signal.clicks,
      impressions: signal.impressions,
      position: signal.position,
      qualifyingSnapshotCount,
      persistentReviewEvidence,
      humanReviewEligible: currentDataAvailable && transition === "PERSISTING" && persistentReviewEvidence,
      automaticWrite: false,
    };
  });

  const result = {
    type: "mse-25.49-search-demand-lifecycle",
    sourceEvidenceFingerprint: current.evidenceFingerprint || null,
    previousEvidenceFingerprint: previous?.evidenceFingerprint || null,
    dataState: current.dataState,
    lifecycleState: currentDataAvailable ? "SEARCH_DEMAND_LIFECYCLE_ACTIVE" : "WAITING_FOR_SEARCH_DEMAND_DATA",
    noDataIsNotNoDemand: true,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      humanReviewBeforeSeoExecution: true,
      persistentDemandRequiredBeforeHumanReview: true,
      minimumConsecutiveQualifyingSnapshots: MIN_QUALIFYING_SNAPSHOTS,
      qualifyingEvidenceStrengths: [...REVIEW_QUALIFYING],
      singleSnapshotSpikeIsInsufficient: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      noDemandInferenceFromMissingData: true,
      automaticWrites: false,
    },
    signals,
    summary: {
      signalCount: signals.length,
      newCount: signals.filter((s) => s.transition === "NEW").length,
      persistingCount: signals.filter((s) => s.transition === "PERSISTING").length,
      disappearedCount: signals.filter((s) => s.transition === "DISAPPEARED").length,
      unknownNoDataCount: signals.filter((s) => s.transition === "UNKNOWN_NO_DATA").length,
      singleSnapshotQualifyingCount: signals.filter((s) => s.qualifyingSnapshotCount === 1).length,
      persistentReviewEvidenceCount: signals.filter((s) => s.persistentReviewEvidence).length,
      humanReviewEligibleCount: signals.filter((s) => s.humanReviewEligible).length,
      automaticWriteCount: 0,
    },
  };
  return { ...result, lifecycleFingerprint: fingerprint(result) };
}

module.exports = {
  buildSearchDemandLifecycle,
  classifyTransition,
  qualifyingPersistence,
  signalKey,
  MIN_QUALIFYING_SNAPSHOTS,
};
