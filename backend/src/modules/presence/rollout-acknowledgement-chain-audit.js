"use strict";

function auditAcknowledgementChain(acknowledgements = []) {
  const rows = acknowledgements.filter((ack) => Number(ack?.chainVersion || 0) >= 1 && ack?.snapshotId);
  if (!rows.length) return Object.freeze({ ready: true, versioned: false, rootSnapshotId: null, depth: 0, roots: Object.freeze([]), missingParents: Object.freeze([]), cycles: Object.freeze([]), forks: Object.freeze([]), rootMismatches: Object.freeze([]), missingRootDeclarations: Object.freeze([]), rootProofMode: "none", explicitRootDeclarations: 0, legacyRootDeclarations: 0, explicitCoveragePercent: 100, fullyExplicit: true, latestRootExplicit: true, sealedFromSnapshotId: null });

  const byId = new Map(rows.map((ack) => [ack.snapshotId, ack]));
  const roots = rows.filter((ack) => !ack.previousAcknowledgementSnapshotId).map((ack) => ack.snapshotId);
  const rootSnapshotId = roots.length === 1 ? roots[0] : null;
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
      if (seen.has(cursor.snapshotId)) { cycles.push(Object.freeze([...seen, cursor.snapshotId])); break; }
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

  const declaredRoots = rows.filter((ack) => ack.rootAcknowledgementSnapshotId);
  const rootMismatches = rootSnapshotId ? declaredRoots.filter((ack) => ack.rootAcknowledgementSnapshotId !== rootSnapshotId).map((ack) => Object.freeze({ snapshotId: ack.snapshotId, declaredRootSnapshotId: ack.rootAcknowledgementSnapshotId, expectedRootSnapshotId: rootSnapshotId })) : [];
  const missingRootDeclarations = rootSnapshotId ? rows.filter((ack) => !ack.rootAcknowledgementSnapshotId).map((ack) => ack.snapshotId) : [];
  const rootProofMode = declaredRoots.length ? (missingRootDeclarations.length ? "mixed_legacy_explicit" : "explicit") : "legacy_inferred";
  const explicitRootDeclarations = declaredRoots.length;
  const legacyRootDeclarations = missingRootDeclarations.length;
  const explicitCoveragePercent = rows.length ? Math.round((explicitRootDeclarations / rows.length) * 100) : 100;
  const fullyExplicit = rows.length > 0 && explicitRootDeclarations === rows.length;
  const latestRootExplicit = Boolean(rows[0]?.rootAcknowledgementSnapshotId);
  const sealedFromSnapshotId = declaredRoots.length ? [...rows].reverse().find((ack) => ack.rootAcknowledgementSnapshotId)?.snapshotId || null : null;

  const ready = roots.length === 1 && missingParents.length === 0 && uniqueCycles.length === 0 && forks.length === 0 && depth === rows.length && rootMismatches.length === 0;
  return Object.freeze({ ready, versioned: true, rootSnapshotId, depth, roots: Object.freeze(roots), missingParents: Object.freeze(missingParents), cycles: Object.freeze(uniqueCycles), forks: Object.freeze(forks), rootMismatches: Object.freeze(rootMismatches), missingRootDeclarations: Object.freeze(missingRootDeclarations), rootProofMode, explicitRootDeclarations, legacyRootDeclarations, explicitCoveragePercent, fullyExplicit, latestRootExplicit, sealedFromSnapshotId });
}

module.exports = { auditAcknowledgementChain };
