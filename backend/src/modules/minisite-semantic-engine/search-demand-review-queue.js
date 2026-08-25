const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function buildSearchDemandReviewQueue({ observation, generatedAt = new Date().toISOString() } = {}) {
  if (!observation || observation.certified !== true) throw new Error("MSE_25_51_UNCERTIFIED_OBSERVATION");
  if (observation.writes === true || Number(observation.automaticWriteCount || 0) !== 0) throw new Error("MSE_25_51_UNSAFE_OBSERVATION");

  const lifecycle = observation.lifecycle || observation.lifecycleReport || observation;
  const signals = Array.isArray(lifecycle.signals) ? lifecycle.signals : [];
  const items = signals
    .filter((signal) => signal && signal.humanReviewEligible === true)
    .map((signal) => ({
      key: signal.key || [signal.siteSlug, signal.intent, signal.query, signal.page].filter(Boolean).join("|"),
      siteSlug: signal.siteSlug || null,
      intent: signal.intent || null,
      query: signal.query || null,
      page: signal.page || null,
      evidenceLevel: signal.evidenceLevel || signal.level || null,
      lifecycleStatus: signal.lifecycleStatus || signal.status || "PERSISTING",
      reviewReason: "PERSISTENT_SEARCH_DEMAND_EVIDENCE",
      reviewOnly: true,
      executable: false,
      automaticWrite: false,
    }))
    .sort((a, b) => String(a.key).localeCompare(String(b.key)));

  const queue = {
    type: "MSE_25_51_SEARCH_DEMAND_REVIEW_QUEUE",
    generatedAt,
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourceObservationFingerprint: observation.observationFingerprint || null,
    dataState: observation.dataState || lifecycle.dataState || null,
    lifecycleState: observation.lifecycleState || lifecycle.lifecycleState || null,
    items,
    summary: {
      reviewItemCount: items.length,
      executableCount: 0,
      automaticWriteCount: 0,
    },
    policy: {
      persistentEvidenceRequired: true,
      humanReviewRequired: true,
      automaticWrites: false,
      pageCreation: false,
      websiteDesignerMutation: false,
      publication: false,
    },
  };
  queue.queueFingerprint = fingerprint(queue);
  return queue;
}

module.exports = { buildSearchDemandReviewQueue, fingerprint };
