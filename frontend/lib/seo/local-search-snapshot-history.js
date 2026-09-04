function snapshotKey(snapshot) {
  const capturedAt = String(snapshot?.capturedAt || "").trim();
  const period = snapshot?.period == null ? "" : JSON.stringify(snapshot.period);
  return `${capturedAt}::${period}`;
}

function sortableTimestamp(snapshot) {
  const value = Date.parse(String(snapshot?.capturedAt || ""));
  return Number.isFinite(value) ? value : 0;
}

export function normalizeLocalSearchSnapshotHistory(history = []) {
  const unique = new Map();

  for (const snapshot of Array.isArray(history) ? history : []) {
    if (!snapshot || typeof snapshot !== "object") continue;
    const key = snapshotKey(snapshot);
    if (key === "::\"\"" || key === "::") continue;
    unique.set(key, snapshot);
  }

  return [...unique.values()].sort((left, right) => {
    const timestampDelta = sortableTimestamp(left) - sortableTimestamp(right);
    if (timestampDelta !== 0) return timestampDelta;
    return snapshotKey(left).localeCompare(snapshotKey(right));
  });
}

export function appendLocalSearchSnapshotHistory(history = [], snapshot = null) {
  if (!snapshot || typeof snapshot !== "object") {
    return normalizeLocalSearchSnapshotHistory(history);
  }
  return normalizeLocalSearchSnapshotHistory([...(Array.isArray(history) ? history : []), snapshot]);
}

export function latestLocalSearchSnapshot(history = []) {
  const normalized = normalizeLocalSearchSnapshotHistory(history);
  return normalized.length ? normalized[normalized.length - 1] : null;
}
