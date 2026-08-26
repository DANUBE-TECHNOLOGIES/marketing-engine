"use strict";

const LIFECYCLE_STATES = Object.freeze({
  NEW: "NEW",
  PERSISTING: "PERSISTING",
  RESOLVED: "RESOLVED",
  REOPENED: "REOPENED",
});

function toIso(value, fallback = new Date()) {
  const date = value instanceof Date ? value : new Date(value || fallback);
  return Number.isNaN(date.getTime()) ? new Date(fallback).toISOString() : date.toISOString();
}

function indexById(items) {
  return new Map((items || []).filter((item) => item?.id).map((item) => [item.id, item]));
}

function ageHours(firstSeenAt, observedAt) {
  const start = new Date(firstSeenAt).getTime();
  const end = new Date(observedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.floor((end - start) / 3600000);
}

function nextActiveRecord({ incident, previous, observedAt }) {
  const hadPrevious = Boolean(previous);
  const wasResolved = previous?.active === false || previous?.state === LIFECYCLE_STATES.RESOLVED;
  const firstSeenAt = previous?.firstSeenAt || observedAt;
  const occurrenceCount = Number(previous?.occurrenceCount || 0) + 1;
  const state = !hadPrevious ? LIFECYCLE_STATES.NEW : wasResolved ? LIFECYCLE_STATES.REOPENED : LIFECYCLE_STATES.PERSISTING;

  return {
    ...incident,
    state,
    active: true,
    firstSeenAt,
    lastSeenAt: observedAt,
    resolvedAt: null,
    occurrenceCount,
    consecutiveObservationCount: wasResolved ? 1 : Number(previous?.consecutiveObservationCount || 0) + 1,
    reopenCount: Number(previous?.reopenCount || 0) + (wasResolved ? 1 : 0),
    ageHours: ageHours(firstSeenAt, observedAt),
  };
}

function resolvedRecord({ previous, observedAt }) {
  return {
    ...previous,
    state: LIFECYCLE_STATES.RESOLVED,
    active: false,
    resolvedAt: previous?.resolvedAt || observedAt,
    lastEvaluatedAt: observedAt,
    consecutiveObservationCount: 0,
    ageHours: ageHours(previous?.firstSeenAt, previous?.lastSeenAt || observedAt),
  };
}

function evaluateIncidentLifecycle({ incidents = [], previousRecords = [], observedAt = new Date() } = {}) {
  const timestamp = toIso(observedAt);
  const previousById = indexById(previousRecords);
  const currentById = indexById(incidents);
  const active = incidents.map((incident) => nextActiveRecord({ incident, previous: previousById.get(incident.id), observedAt: timestamp }));
  const resolved = previousRecords
    .filter((previous) => previous?.id && previous.active !== false && !currentById.has(previous.id))
    .map((previous) => resolvedRecord({ previous, observedAt: timestamp }));

  const records = [...active, ...resolved].sort((a, b) => String(a.id).localeCompare(String(b.id)));
  const count = (state) => records.filter((item) => item.state === state).length;

  return {
    version: "mse-25.73",
    observedAt: timestamp,
    summary: {
      activeCount: active.length,
      resolvedCount: resolved.length,
      newCount: count(LIFECYCLE_STATES.NEW),
      persistingCount: count(LIFECYCLE_STATES.PERSISTING),
      reopenedCount: count(LIFECYCLE_STATES.REOPENED),
    },
    records,
    invariants: {
      automaticRemediation: false,
      googleWrites: false,
      pageMutation: false,
      notificationSideEffects: false,
    },
  };
}

module.exports = {
  LIFECYCLE_STATES,
  ageHours,
  evaluateIncidentLifecycle,
};
