"use strict";

const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { normalizedScope, scopeMatchesPlan, approvedFingerprintMatches } = require("./pilot-campaign-approval");
const { evaluateSourceEvidenceBinding } = require("./rollout-promotion-gate");
const { getRecoveryStabilization } = require("./campaign-recovery-stabilization");
const { evaluateRecoveryStabilizationSnapshotBinding } = require("./campaign-recovery-stabilization-snapshot");

function evaluateCampaignBinding(campaign){const blockers=[];if(!campaign?.preflightId)blockers.push("campaign_preflight_missing");if(!campaign?.approvedScope)blockers.push("campaign_scope_missing");if(!scopeMatchesPlan(campaign))blockers.push("campaign_scope_changed");if(!approvedFingerprintMatches(campaign))blockers.push("campaign_approved_fingerprint_mismatch");return Object.freeze({ready:blockers.length===0,scope:normalizedScope(campaign),blockers:Object.freeze(blockers)});}

async function evaluatePilotExecutionGate(prisma,campaign){
  if(!campaign?.pilot)return Object.freeze({ready:true,decision:"go",pilot:false,blockers:Object.freeze([]),warnings:Object.freeze([])});
  const [preflight,currentReadiness]=await Promise.all([getLatestDeploymentPreflight(prisma),buildDeploymentReadiness(prisma)]);
  const binding=evaluateCampaignBinding(campaign);const activation=evaluatePilotActivationGate({preflight,currentReadiness});const sourceEvidence=await evaluateSourceEvidenceBinding(prisma,campaign,currentReadiness?.network?.agencyCount||0);
  const recoverySourceCampaignId=campaign?.approvedScope?.recoveryOfCampaignId||null;
  const recoveryStabilization=recoverySourceCampaignId?await getRecoveryStabilization(prisma,recoverySourceCampaignId):Object.freeze({ready:true,decision:"go",blockers:Object.freeze([])});
  const recoverySnapshot=recoverySourceCampaignId?await evaluateRecoveryStabilizationSnapshotBinding(prisma,recoverySourceCampaignId,{snapshotId:campaign?.approvedScope?.recoveryStabilizationSnapshotId||null,evidenceSignature:campaign?.approvedScope?.recoveryStabilizationEvidenceSignature||null}):Object.freeze({ready:true,decision:"go",blockers:Object.freeze([])});
  const blockers=[...new Set([...(binding.blockers||[]),...(activation.blockers||[]),...(sourceEvidence.blockers||[]),...(recoveryStabilization.blockers||[]),...(recoverySnapshot.blockers||[])])];
  if(campaign.preflightId!==preflight?.preflightId)blockers.push("pilot_campaign_preflight_mismatch");
  const ready=binding.ready===true&&activation.ready===true&&sourceEvidence.ready===true&&recoveryStabilization.ready===true&&recoverySnapshot.ready===true&&campaign.preflightId===preflight?.preflightId;
  return Object.freeze({ready,decision:ready?"go":"no_go",pilot:true,preflightId:campaign.preflightId||null,latestPreflightId:preflight?.preflightId||null,binding,activation,sourceEvidence,recoveryStabilization,recoverySnapshot,blockers:Object.freeze([...new Set(blockers)]),warnings:Object.freeze([...(activation.warnings||[])])});
}

async function assertPilotExecutionReady(prisma,campaign){const gate=await evaluatePilotExecutionGate(prisma,campaign);if(gate.ready)return gate;const error=new Error("Pilot execution gate NO-GO");error.status=409;error.code="PILOT_EXECUTION_GATE_NO_GO";error.readiness=gate;throw error;}
module.exports={evaluateCampaignBinding,evaluatePilotExecutionGate,assertPilotExecutionReady};
