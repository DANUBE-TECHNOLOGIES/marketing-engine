"use strict";

function stableList(values = []) { return [...new Set(values.map(String))].sort(); }
function stageKey(stage = {}) { return `${Number(stage.stagePercent || 0)}:${stage.campaignId || ""}:${stage.reportId || ""}:${typeof stage.provenance === "string" ? stage.provenance : stage.provenance?.kind || "native"}:${stage.regenerationOfCampaignId || ""}:${stage.recoveryOfCampaignId || ""}`; }
function governanceKey(snapshot = {}) { const policy=snapshot?.governancePolicy||{}; return `${Number(policy.acknowledgementSealingMinPercent||0)}:${Number(policy.version||0)}`; }
function compareRolloutDecision(current, previous) {
  if (!previous) return Object.freeze({ changed: false, baselineMissing: true, severity: "info", changes: Object.freeze([]), currentSnapshotId: current?.snapshotId || null, previousSnapshotId: null });
  const changes = [];
  if ((current?.decision || "no_go") !== (previous?.decision || "no_go")) changes.push({ type: "decision", before: previous?.decision || null, after: current?.decision || null });
  if ((current?.nextStagePercent ?? null) !== (previous?.nextStagePercent ?? null)) changes.push({ type: "next_stage", before: previous?.nextStagePercent ?? null, after: current?.nextStagePercent ?? null });
  if ((current?.maxAgencies ?? null) !== (previous?.maxAgencies ?? null)) changes.push({ type: "max_agencies", before: previous?.maxAgencies ?? null, after: current?.maxAgencies ?? null });
  const beforeBlockers = stableList(previous?.blockers || []), afterBlockers = stableList(current?.blockers || []);
  if (JSON.stringify(beforeBlockers) !== JSON.stringify(afterBlockers)) changes.push({ type: "blockers", before: beforeBlockers, after: afterBlockers });
  const beforeStages = stableList((previous?.stages || []).map(stageKey)), afterStages = stableList((current?.stages || []).map(stageKey));
  if (JSON.stringify(beforeStages) !== JSON.stringify(afterStages)) changes.push({ type: "evidence_provenance", before: beforeStages, after: afterStages });
  const beforeCritical = Number(previous?.recoveryTrust?.critical || 0), afterCritical = Number(current?.recoveryTrust?.critical || 0);
  if (beforeCritical !== afterCritical) changes.push({ type: "critical_recovery", before: beforeCritical, after: afterCritical });
  const beforeGovernance=governanceKey(previous),afterGovernance=governanceKey(current);
  if(beforeGovernance!==afterGovernance)changes.push({type:"governance_policy",before:previous?.governancePolicy||null,after:current?.governancePolicy||null});
  const beforeThreshold=Number(previous?.governancePolicy?.acknowledgementSealingMinPercent||0),afterThreshold=Number(current?.governancePolicy?.acknowledgementSealingMinPercent||0);
  const governanceTightened=afterThreshold>beforeThreshold;
  const degraded = (previous?.ready === true && current?.ready !== true) || beforeCritical < afterCritical || ((previous?.decision === "go" || previous?.decision === "complete") && current?.decision === "no_go") || governanceTightened;
  return Object.freeze({ changed: changes.length > 0, baselineMissing: false, severity: degraded ? "critical" : changes.length ? "warning" : "none", changes: Object.freeze(changes.map(Object.freeze)), currentSnapshotId: current?.snapshotId || null, previousSnapshotId: previous?.snapshotId || null });
}
module.exports = { compareRolloutDecision, stageKey, governanceKey };
