"use strict";

function compactGovernancePolicy(policy) {
  if (!policy) return null;
  return Object.freeze({
    acknowledgementSealingMinPercent: Number(policy.acknowledgementSealingMinPercent || 0),
    version: Number(policy.version || 1)
  });
}

function compareRolloutGovernance(currentSnapshot, frozenSnapshot) {
  const current = compactGovernancePolicy(currentSnapshot?.governancePolicy) || Object.freeze({ acknowledgementSealingMinPercent: 0, version: 1 });
  const frozen = compactGovernancePolicy(frozenSnapshot?.governancePolicy);
  const baselineMissing = !frozenSnapshot;
  const legacyFrozenPolicy = Boolean(frozenSnapshot && !frozen);
  const previousPercent = frozen ? frozen.acknowledgementSealingMinPercent : null;
  const currentPercent = current.acknowledgementSealingMinPercent;
  const changed = baselineMissing ? false : legacyFrozenPolicy || previousPercent !== currentPercent || Number(frozen?.version || 0) !== Number(current.version || 0);
  const direction = baselineMissing
    ? "baseline_missing"
    : legacyFrozenPolicy
      ? "legacy_migration"
      : currentPercent > previousPercent
        ? "tightened"
        : currentPercent < previousPercent
          ? "relaxed"
          : changed
            ? "version_changed"
            : "unchanged";
  const severity = direction === "tightened" ? "critical" : changed ? "warning" : baselineMissing ? "info" : "none";
  return Object.freeze({
    changed,
    baselineMissing,
    legacyFrozenPolicy,
    direction,
    severity,
    current,
    frozen,
    currentSnapshotId: currentSnapshot?.snapshotId || null,
    frozenSnapshotId: frozenSnapshot?.snapshotId || null
  });
}

module.exports = { compactGovernancePolicy, compareRolloutGovernance };
