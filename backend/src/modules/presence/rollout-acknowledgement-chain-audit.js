"use strict";

function auditAcknowledgementChain(acknowledgements = []) {
  const rows = acknowledgements.filter((ack) => Number(ack?.chainVersion || 0) >= 1 && ack?.snapshotId);
  if (!rows.length) return Object.freeze({ ready: true, versioned: false, rootSnapshotId: null, depth: 0, roots: Object.freeze([]), missingParents: Object.freeze([]), cycles: Object.freeze([]), forks: Object.freeze([]) });

  const byId = new Map(rows.map((ack) => [ack.snapshotId, ack]));
  const roots = rows.filter((ack) => !ack.previousAcknowledgementSnapshotId).map((ack) => ack.snapshotId);
  const missingParents = rows.filter((ack) => ack.previousAcknowledgementSnapshotId && !byId.has(ack.previousAcknowledgementSnapshotId)).map((ack) => Object.freeze({ snapshotId: ack.snapshotId, missingParentSnapshotId: ack.previousAcknowledgementSnapshotId }));

  const successors = new Map();
  for (const ack of rows) {
    const parent = ack.previousAcknowledgementSnapshotId;
    if (!parent) continue;
    if (!successors.has(parent)) successors.set(parent, new Set());
    successors.get(parent).add(ack.snapshotId);
  }
  const forks = [...successors.entries()].filter(([, children]) => children.size > 1).map(([previousSnapshotId, children]) => Object.freeze({ previousSnapshotId, successors: Object.freeze([...children]) }));

  const cycles = [];
  for (const ack of rows) {
    const seen = new Set();
    let cursor = ack;
    while (cursor?.previousAcknowledgementSnapshotId) {
      if (seen.has(cursor.snapshotId)) {
        cycles.push(Object.freeze([...seen, cursor.snapshotId]));
        break;
      }
      seen.add(cursor.snapshotId);
      cursor = byId.get(cursor.previousAcknowledgementSnapshotId) || null;
    }
  }

  const uniqueCycles = [];
  const cycleKeys = new Set();
  for (const cycle of cycles) {
    const key = [...new Set(cycle)].sort().join("|");
    if (!cycleKeys.has(key)) { cycleKeys.add(key); uniqueCycles.push(cycle); }
  }

  let depth = 0;
  let cursor = rows[0];
  const latestSeen = new Set();
  while (cursor && !latestSeen.has(cursor.snapshotId)) {
    latestSeen.add(cursor.snapshotId);
    depth += 1;
    cursor = cursor.previousAcknowledgementSnapshotId ? byId.get(cursor.previousAcknowledgementSnapshotId) || null : null;
  }

  const ready = roots.length === 1 && missingParents.length === 0 && uniqueCycles.length === 0 && forks.length === 0 && depth === rows.length;
  return Object.freeze({ ready, versioned: true, rootSnapshotId: roots.length === 1 ? roots[0] : null, depth, roots: Object.freeze(roots), missingParents: Object.freeze(missingParents), cycles: Object.freeze(uniqueCycles), forks: Object.freeze(forks) });
}

module.exports = { auditAcknowledgementChain };
