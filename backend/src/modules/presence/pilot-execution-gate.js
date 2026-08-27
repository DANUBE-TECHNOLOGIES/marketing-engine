"use strict";

const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { normalizedScope, scopeMatchesPlan, approvedFingerprintMatches } = require("./pilot-campaign-approval");
const { evaluateSourceEvidenceBinding } = require("./rollout-promotion-gate");
const { evaluateRecoveryTrustChain } = require("./recovery-trust-chain");
const { evaluatePreflightRecoveryTrustBinding } = require("./preflight-recovery-trust-binding");

function evaluateCampaignBinding(campaign){const blockers=[];if(!campaign?.preflightId)blockers.push("campaign_preflight_missing");if(!campaign?.approvedScope)blockers.push("campaign_scope_missing");if(!scopeMatchesPlan(campaign))blockers.push("campaign_scope_changed");if(!approvedFingerprintMatches(campaign))blockers.push("campaign_approved_fingerprint_mismatch");return Object.freeze({ready:blockers.length===0,scope:normalizedScope(campaign),blockers:Object.freeze(blockers)});}
function compactGovernanceDiagnostic(sourceEvidence){const acknowledgement=sourceEvidence?.decisionAcknowledgement||null;if(!acknowledgement)return null;const drift=acknowledgement.drift||null;const governanceChange=(drift?.changes||[]).find(change=>change.type==="governance_policy")||null;return Object.freeze({policyDrift:acknowledgement.governancePolicyDrift===true,severity:drift?.severity||"none",currentSnapshotId:acknowledgement.currentSnapshotId||null,previousSnapshotId:acknowledgement.previousSnapshotId||null,before:governanceChange?.before||null,after:governanceChange?.after||null,blockers:Object.freeze((acknowledgement.blockers||[]).filter(blocker=>String(blocker).includes("governance_policy")))});}

async function evaluatePilotExecutionGate(prisma,campaign){
  if(!campaign?.pilot)return Object.freeze({ready:true,decision:"go",pilot:false,blockers:Object.freeze([]),warnings:Object.freeze([]),governanceDiagnostic:null});
  const [preflight,currentReadiness]=await Promise.all([getLatestDeploymentPreflight(prisma),buildDeploymentReadiness(prisma)]);
  const binding=evaluateCampaignBinding(campaign);
  const activation=evaluatePilotActivationGate({preflight,currentReadiness});
  const preflightTrustBinding=evaluatePreflightRecoveryTrustBinding(campaign,preflight);
  const sourceEvidence=await evaluateSourceEvidenceBinding(prisma,campaign,currentReadiness?.network?.agencyCount||0);
  const recoveryTrustChain=await evaluateRecoveryTrustChain(prisma,campaign);
  const blockers=[...new Set([...(binding.blockers||[]),...(activation.blockers||[]),...(preflightTrustBinding.blockers||[]),...(sourceEvidence.blockers||[]),...(recoveryTrustChain.blockers||[])])];
  if(campaign.preflightId!==preflight?.preflightId)blockers.push("pilot_campaign_preflight_mismatch");
  const ready=binding.ready===true&&activation.ready===true&&preflightTrustBinding.ready===true&&sourceEvidence.ready===true&&recoveryTrustChain.ready===true&&campaign.preflightId===preflight?.preflightId;
  return Object.freeze({ready,decision:ready?"go":"no_go",pilot:true,preflightId:campaign.preflightId||null,latestPreflightId:preflight?.preflightId||null,binding,activation,preflightTrustBinding,sourceEvidence,recoveryTrustChain,governanceDiagnostic:compactGovernanceDiagnostic(sourceEvidence),blockers:Object.freeze([...new Set(blockers)]),warnings:Object.freeze([...(activation.warnings||[])])});
}

async function assertPilotExecutionReady(prisma,campaign){const gate=await evaluatePilotExecutionGate(prisma,campaign);if(gate.ready)return gate;const error=new Error("Pilot execution gate NO-GO");error.status=409;error.code="PILOT_EXECUTION_GATE_NO_GO";error.readiness=gate;throw error;}
module.exports={evaluateCampaignBinding,compactGovernanceDiagnostic,evaluatePilotExecutionGate,assertPilotExecutionReady};
