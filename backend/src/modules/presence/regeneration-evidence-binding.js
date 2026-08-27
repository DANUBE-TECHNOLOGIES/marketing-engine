"use strict";

const { getCampaign } = require("./campaign-store");

function compactRegenerationEvidence(campaign) {
  const scope = campaign?.approvedScope || {};
  if (!scope.regenerationOfCampaignId) return Object.freeze({ regeneration: false, sourceCampaignId: null, reason: null, sourceDecision: null });
  return Object.freeze({
    regeneration: true,
    sourceCampaignId: String(scope.regenerationOfCampaignId),
    reason: scope.regenerationReason || null,
    sourceDecision: scope.regenerationSourceDecision || null
  });
}

function frozenRegenerationBindingClean(campaign, frozen) {
  const scope = campaign?.approvedScope || {};
  if (!scope.regenerationOfCampaignId) return true;
  const evidence = frozen?.report?.pilotEvidence?.regenerationEvidence || null;
  return Boolean(
    evidence?.regeneration === true &&
    evidence.sourceCampaignId === scope.regenerationOfCampaignId &&
    evidence.reason === (scope.regenerationReason || null) &&
    evidence.sourceDecision === (scope.regenerationSourceDecision || null)
  );
}

async function evaluateRegenerationEvidenceBinding(prisma, campaign) {
  const scope = campaign?.approvedScope || {};
  if (!scope.regenerationOfCampaignId) return Object.freeze({ ready: true, decision: "go", required: false, blockers: Object.freeze([]), evidence: compactRegenerationEvidence(campaign), sourceCampaign: null });
  const blockers = [];
  if (!scope.regenerationReason) blockers.push("regeneration_reason_missing");
  if (!scope.regenerationSourceDecision) blockers.push("regeneration_source_decision_missing");
  const sourceCampaign = await getCampaign(prisma, scope.regenerationOfCampaignId);
  if (!sourceCampaign) blockers.push("regeneration_source_campaign_missing");
  if (sourceCampaign?.campaignId === campaign?.campaignId) blockers.push("regeneration_self_reference");
  const ready = blockers.length === 0;
  return Object.freeze({ ready, decision: ready ? "go" : "no_go", required: true, blockers: Object.freeze([...new Set(blockers)]), evidence: compactRegenerationEvidence(campaign), sourceCampaign: sourceCampaign ? Object.freeze({ campaignId: sourceCampaign.campaignId, status: sourceCampaign.status, preflightId: sourceCampaign.preflightId || null }) : null });
}

module.exports = { compactRegenerationEvidence, frozenRegenerationBindingClean, evaluateRegenerationEvidenceBinding };
