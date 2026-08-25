"use strict";

const { stableId } = require("./campaign-planner");

function executionIndexes(executions = []) {
  return new Set(executions.map((row) => Number(row.campaignIndex)).filter(Number.isInteger));
}

function qualificationIndexes(qualifications = []) {
  return new Set(qualifications.map((row) => Number(row?.payload?.campaignIndex ?? row?.result?.campaignIndex)).filter(Number.isInteger));
}

function evaluateRecoveryQualificationState(uncertain = [], qualifications = []) {
  const qualified = qualificationIndexes(qualifications);
  const unresolved = uncertain.filter((row) => !qualified.has(Number(row.campaignIndex)));
  const manual = qualifications.filter((row) => {
    const classification = row?.result?.classification || row?.status;
    return classification === "not_applied" || classification === "partial_or_changed";
  });
  return Object.freeze({
    complete: unresolved.length === 0,
    unresolvedCount: unresolved.length,
    unresolved: Object.freeze(unresolved.map((row) => ({ campaignIndex: Number(row.campaignIndex), agencyId: row.agencyId || null, operationId: row.operationId || null, status: row.status || null }))),
    manualInterventionRequired: manual.length > 0,
    manualCount: manual.length
  });
}

function buildRecoveryPlan(sourceCampaign, currentCockpit, executions = [], preflightId = null) {
  const sourcePlan = sourceCampaign?.plan || {};
  const touched = executionIndexes(executions);
  const sourceExecutable = Array.isArray(sourcePlan.executable) ? sourcePlan.executable : [];
  const remainingExecutable = sourceExecutable
    .map((item, index) => ({ ...item, sourceCampaignIndex: index }))
    .filter((item) => !touched.has(item.sourceCampaignIndex));
  const agencyIds = [...new Set(remainingExecutable.map((item) => Number(item.agencyId)).filter(Number.isInteger))];
  const approved = sourceCampaign?.approvedScope || {};
  const policy = { maxItems: remainingExecutable.length, allowSensitive: false, agencyIds, providerKeys: ["google_business_profile"] };
  const fingerprintInput = remainingExecutable.map((item) => [item.sourceCampaignIndex, item.agencyId, item.providerKey, item.listingId, item.drift]);
  return Object.freeze({
    campaignId: `presence-recovery-${stableId({ sourceCampaignId: sourceCampaign?.campaignId, preflightId, fingerprintInput })}`,
    createdAt: new Date().toISOString(),
    recoveryOfCampaignId: sourceCampaign?.campaignId || null,
    policy: Object.freeze(policy),
    baseline: Object.freeze({ health: currentCockpit?.health || {}, summary: currentCockpit?.summary || {} }),
    selectedCount: remainingExecutable.length,
    executableCount: remainingExecutable.length,
    manualCount: 0,
    selected: Object.freeze(remainingExecutable),
    executable: Object.freeze(remainingExecutable),
    manual: Object.freeze([]),
    sourceScope: Object.freeze({ rolloutStage: approved.rolloutStage || null, sourceEvidenceCampaignId: approved.sourceEvidenceCampaignId || null, sourceEvidenceReportId: approved.sourceEvidenceReportId || null, sourceEvidenceReportCreatedAt: approved.sourceEvidenceReportCreatedAt || null })
  });
}

function evaluateRecoveryEligibility(sourceCampaign, executions = [], latestPreflight = null) {
  const blockers = [];
  if (!sourceCampaign || sourceCampaign.status !== "failed") blockers.push("source_campaign_not_failed");
  if (sourceCampaign?.pilot !== true) blockers.push("source_campaign_not_pilot");
  if (!latestPreflight?.preflightId) blockers.push("fresh_preflight_missing");
  if (sourceCampaign?.preflightId && latestPreflight?.preflightId === sourceCampaign.preflightId) blockers.push("fresh_preflight_required_after_failure");
  const touched = executions.filter((row) => Number.isInteger(Number(row.campaignIndex)));
  const uncertain = touched.filter((row) => row.status === "failed" || row.operationId);
  return Object.freeze({
    ready: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    blockers: Object.freeze(blockers),
    touchedCount: touched.length,
    uncertainCount: uncertain.length,
    uncertain: Object.freeze(uncertain.map((row) => ({ campaignIndex: row.campaignIndex, agencyId: row.agencyId || null, operationId: row.operationId || null, status: row.status })))
  });
}

module.exports = { executionIndexes, qualificationIndexes, evaluateRecoveryQualificationState, buildRecoveryPlan, evaluateRecoveryEligibility };
