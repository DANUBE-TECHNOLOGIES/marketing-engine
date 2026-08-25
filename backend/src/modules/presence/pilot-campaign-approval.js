"use strict";

const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { stableId } = require("./campaign-planner");

function normalizedScope(campaign) {
  const scope = campaign?.approvedScope || {};
  return {
    agencyIds: Array.isArray(scope.agencyIds) ? scope.agencyIds.map(Number).filter(Number.isInteger).sort((a,b)=>a-b) : [],
    providerKeys: Array.isArray(scope.providerKeys) ? scope.providerKeys.map(String).sort() : [],
    maxItems: Number(scope.maxItems || 0),
    allowSensitive: scope.allowSensitive === true,
    rolloutStage: [50, 100].includes(Number(scope.rolloutStage)) ? Number(scope.rolloutStage) : null,
    sourceEvidenceCampaignId: scope.sourceEvidenceCampaignId || null
  };
}

function scopeMatchesPlan(campaign) {
  const scope = normalizedScope(campaign);
  const policy = campaign?.plan?.policy || campaign?.policy || {};
  const planAgencyIds = Array.isArray(policy.agencyIds) ? policy.agencyIds.map(Number).filter(Number.isInteger).sort((a,b)=>a-b) : [];
  const planProviderKeys = Array.isArray(policy.providerKeys) ? policy.providerKeys.map(String).sort() : [];
  return JSON.stringify(scope.agencyIds) === JSON.stringify(planAgencyIds)
    && JSON.stringify(scope.providerKeys) === JSON.stringify(planProviderKeys)
    && scope.maxItems === Number(policy.maxItems || 0)
    && scope.allowSensitive === (policy.allowSensitive === true);
}

function approvedFingerprintMatches(campaign) {
  if (!campaign?.approvedPlanFingerprint || !campaign?.approvedScope) return false;
  const expected = stableId({ approvedScope: campaign.approvedScope, selected: campaign?.plan?.selected || [] });
  return expected === campaign.approvedPlanFingerprint;
}

async function assertPilotCampaignTransition(prisma, campaign, toStatus) {
  if (campaign?.pilot !== true || !["approved", "running"].includes(toStatus)) return;
  const blockers = [];
  if (!campaign.preflightId) blockers.push("campaign_preflight_missing");
  if (!campaign.approvedScope) blockers.push("campaign_scope_missing");
  if (!scopeMatchesPlan(campaign)) blockers.push("campaign_scope_changed");
  if (!approvedFingerprintMatches(campaign)) blockers.push("campaign_approved_fingerprint_mismatch");
  const [latestPreflight, currentReadiness] = await Promise.all([getLatestDeploymentPreflight(prisma), buildDeploymentReadiness(prisma)]);
  if (!latestPreflight || latestPreflight.preflightId !== campaign.preflightId) blockers.push("campaign_preflight_not_latest");
  const activationGate = evaluatePilotActivationGate({ preflight: latestPreflight, currentReadiness });
  blockers.push(...activationGate.blockers);
  if (blockers.length) {
    const error = new Error(`Pilot campaign transition blocked: ${[...new Set(blockers)].join(",")}`);
    error.status = 409;
    error.code = "PILOT_CAMPAIGN_GATE_NO_GO";
    error.blockers = [...new Set(blockers)];
    throw error;
  }
}

module.exports = { normalizedScope, scopeMatchesPlan, approvedFingerprintMatches, assertPilotCampaignTransition };
