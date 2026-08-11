"use strict";

const FRESH_HOURS = 36;

function ageHours(value, now = new Date()) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round(((now.getTime() - time) / 3600000) * 10) / 10);
}

function agencySnapshotStatus(history = [], now = new Date()) {
  const latest = [...(history || [])]
    .filter((item) => item?.capturedAt)
    .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0] || null;
  if (!latest) return { status: "missing", latestCapturedAt: null, ageHours: null, fresh: false };
  const age = ageHours(latest.capturedAt, now);
  return {
    status: age != null && age <= FRESH_HOURS ? "healthy" : "stale",
    latestCapturedAt: latest.capturedAt,
    ageHours: age,
    fresh: age != null && age <= FRESH_HOURS,
  };
}

function summarizeSnapshotAutomation(rows = []) {
  const observed = rows.filter((row) => row?.agency?.id && row?.snapshotStatus);
  const healthy = observed.filter((row) => row.snapshotStatus.status === "healthy");
  const stale = observed.filter((row) => row.snapshotStatus.status === "stale");
  const missing = observed.filter((row) => row.snapshotStatus.status === "missing");
  const latestCapturedAt = observed
    .map((row) => row.snapshotStatus.latestCapturedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b) - new Date(a))[0] || null;
  return {
    version: "1.0",
    freshnessTargetHours: FRESH_HOURS,
    agenciesObserved: observed.length,
    healthy: healthy.length,
    stale: stale.length,
    missing: missing.length,
    status: stale.length || missing.length ? "attention" : observed.length ? "healthy" : "missing",
    latestCapturedAt,
    issues: [...stale, ...missing].slice(0, 20).map((row) => ({ agency: row.agency, snapshotStatus: row.snapshotStatus })),
  };
}

module.exports = { FRESH_HOURS, ageHours, agencySnapshotStatus, summarizeSnapshotAutomation };
