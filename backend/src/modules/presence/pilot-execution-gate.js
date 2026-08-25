"use strict";

const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { normalizedScope, scopeMatchesPlan, approvedFingerprintMatches } = require("./pilot-campaign-approval");
const { evaluatePilotExtensionGate } = require("./pilot-extension-gate");
const { evaluateNetworkRolloutGate } = require("./network-rollout-gate");

function evaluateCampaignBinding(campaign) {
  const blockers = [];
  if (!campaign?.preflightId) blockers.push("campaign_preflight_missing");
  if (!campaign?.approvedScope) blockers.push("campaign_scope_missing");
  if (!scopeMatchesPlan(campaign)) blockers.push("campaign_scope_changed");
  if (!approvedFingerprintMatches(campaign)) blockers.push("campaign_approved_fingerprint_mismatch");
  return Object.freeze({ ready: blockers.length === 0, scope: normalizedScope(campaign), blockers: Object.freeze(blockers) });
}

async function evaluatePredecessorEvidence(prisma, campaign, currentReadiness) {
  const scope = campaign?.approvedScope || {};
  const rolloutStage = Number(scope.rolloutStage || 0);
  const sourceEvidenceCampaignId = scope.sourceEvidenceCampaignId || null;
  const blockers = [];
  let evidence = null;
  if (rolloutStage === 50 || rolloutStage === 100) {
    evidence = await evaluateNetworkRolloutGate(prisma, currentReadiness?.network?.agencyCount || 0);
    if (!evidence.ready || evidence.nextStagePercent !== rolloutStage) blockers.push("rollout_predecessor_gate_regressed");
    const latestSource = evidence.stages?.[evidence.stages.length - 1]?.campaignId || null;
    if (!sourceEvidenceCampaignId) blockers.push("rollout_source_evidence_missing");
    else if (latestSource !== sourceEvidenceCampaignId) blockers.push("rollout_source_evidence_changed");
  } else if (sourceEvidenceCampaignId) {
    evidence = await evaluatePilotExtensionGate(prisma);
    if (!evidence.ready) blockers.push("extension_predecessor_gate_regressed");
    if (evidence.canaryCampaignId !== sourceEvidenceCampaignId) blockers.push("extension_source_evidence_changed");
  }
  return Object.freeze({ ready: blockers.length === 0, rolloutStage: rolloutStage || null, sourceEvidenceCampaignId, blockers: Object.freeze(blockers), evidence });
}

async function evaluatePilotExecutionGate(prisma, campaign) {
  if (!campaign?.pilot) return Object.freeze({ ready: true, decision: "go", pilot: false, blockers: Object.freeze([]), warnings: Object.freeze([]) });
  const [preflight, currentReadiness] = await Promise.all([getLatestDeploymentPreflight(prisma), buildDeploymentReadiness(prisma)]);
  const binding = evaluateCampaignBinding(campaign);
  const activation = evaluatePilotActivationGate({ preflight, currentReadiness });
  const predecessor = await evaluatePredecessorEvidence(prisma, campaign, currentReadiness);
  const blockers = [...new Set([...(binding.blockers || []), ...(activation.blockers || []), ...(predecessor.blockers || [])])];
  if (campaign.preflightId !== preflight?.preflightId) blockers.push("pilot_campaign_preflight_mismatch");
  const ready = binding.ready === true && activation.ready === true && predecessor.ready === true && campaign.preflightId === preflight?.preflightId;
  return Object.freeze({ ready, decision: ready ? "go" : "no_go", pilot: true, preflightId: campaign.preflightId || null, latestPreflightId: preflight?.preflightId || null, binding, activation, predecessor, blockers: Object.freeze([...new Set(blockers)]), warnings: Object.freeze([...(activation.warnings || [])]) });
}

async function assertPilotExecutionReady(prisma, campaign) {
  const gate = await evaluatePilotExecutionGate(prisma, campaign);
  if (gate.ready) return gate;
  const error = new Error("Pilot execution gate NO-GO");
  error.status = 409;
  error.code = "PILOT_EXECUTION_GATE_NO_GO";
  error.readiness = gate;
  throw error;
}

module.exports = { evaluateCampaignBinding, evaluatePredecessorEvidence, evaluatePilotExecutionGate, assertPilotExecutionReady };
