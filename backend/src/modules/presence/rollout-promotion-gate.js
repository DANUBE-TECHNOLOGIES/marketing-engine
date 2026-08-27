"use strict";

const { getFrozenCampaignReport } = require("./campaign-report-store");
const { evaluatePilotOutcome } = require("./pilot-outcome");
const { evaluatePilotExtensionGate } = require("./pilot-extension-gate");
const { evaluateNetworkRolloutGate } = require("./network-rollout-gate");
const { evaluateRolloutDecisionAcknowledgement } = require("./rollout-decision-ack-gate");

function sameTimestamp(a,b){if(!a||!b)return false;return new Date(a).getTime()===new Date(b).getTime();}
function appendRecoveryTrustBlockers(blockers,gate){for(const blocker of gate?.recoveryTrust?.rolloutBlockers||[])blockers.push(blocker);}
function appendDecisionAcknowledgementBlockers(blockers,decisionAcknowledgement){for(const blocker of decisionAcknowledgement?.blockers||[])blockers.push(blocker);}
function compactAcknowledgementChainDiagnostic(decisionAcknowledgement){const audit=decisionAcknowledgement?.acknowledgementChainAudit||null;if(!audit)return null;return Object.freeze({ready:audit.ready===true,versioned:audit.versioned===true,rootSnapshotId:audit.rootSnapshotId||null,rootProofMode:audit.rootProofMode||"none",depth:Number(audit.depth||0),roots:Object.freeze([...(audit.roots||[])]),missingParents:Object.freeze([...(audit.missingParents||[])]),cycles:Object.freeze([...(audit.cycles||[])]),forks:Object.freeze([...(audit.forks||[])]),rootMismatches:Object.freeze([...(audit.rootMismatches||[])]),missingRootDeclarations:Object.freeze([...(audit.missingRootDeclarations||[])])});}

async function evaluateSourceEvidenceBinding(prisma,campaign,totalAgencies){
  if(campaign?.pilot!==true)return Object.freeze({ready:true,decision:"go",required:false,blockers:Object.freeze([])});
  const scope=campaign.approvedScope||{},stage=Number(scope.rolloutStage||0),sourceCampaignId=scope.sourceEvidenceCampaignId||null,sourceReportId=scope.sourceEvidenceReportId||null,sourceReportCreatedAt=scope.sourceEvidenceReportCreatedAt||null;
  const requiresSource=sourceCampaignId||[50,100].includes(stage)||(stage===0&&Array.isArray(scope.agencyIds)&&scope.agencyIds.length>1);
  if(!requiresSource)return Object.freeze({ready:true,decision:"go",required:false,blockers:Object.freeze([])});
  const blockers=[];
  if(!sourceCampaignId)blockers.push("source_evidence_campaign_missing");if(!sourceReportId)blockers.push("source_evidence_report_missing");if(!sourceReportCreatedAt)blockers.push("source_evidence_report_timestamp_missing");
  const frozen=sourceCampaignId?await getFrozenCampaignReport(prisma,sourceCampaignId):null;
  if(!frozen?.report)blockers.push("source_evidence_frozen_report_missing");if(frozen&&sourceReportId&&String(frozen.id)!==String(sourceReportId))blockers.push("source_evidence_report_id_changed");if(frozen&&sourceReportCreatedAt&&!sameTimestamp(frozen.createdAt,sourceReportCreatedAt))blockers.push("source_evidence_report_timestamp_changed");
  let rollout=null,recoveryTrust=null,decisionAcknowledgement=null;
  if(frozen?.report){rollout=evaluatePilotOutcome(frozen.report,{criticalPropagationAlerts:Number(frozen.report?.pilotEvidence?.criticalPropagationAlerts??0)});if(!rollout.readyForNetworkRollout)blockers.push("source_evidence_rollout_no_go");if(frozen.report?.predecessorComparison?.required===true&&frozen.report.predecessorComparison.ready!==true)blockers.push("source_evidence_predecessor_regressed");}
  if(stage===0&&requiresSource){const extension=await evaluatePilotExtensionGate(prisma);recoveryTrust=extension.recoveryTrust||null;appendRecoveryTrustBlockers(blockers,extension);if(!extension.ready||extension.canaryCampaignId!==sourceCampaignId)blockers.push("source_canary_no_longer_authorized");const currentRolloutGate=await evaluateNetworkRolloutGate(prisma,totalAgencies);decisionAcknowledgement=await evaluateRolloutDecisionAcknowledgement(prisma,currentRolloutGate);appendDecisionAcknowledgementBlockers(blockers,decisionAcknowledgement);}
  if([50,100].includes(stage)){const gate=await evaluateNetworkRolloutGate(prisma,totalAgencies);recoveryTrust=gate.recoveryTrust||null;appendRecoveryTrustBlockers(blockers,gate);const predecessor=gate.stages?.[gate.stages.length-1]||null;if(!gate.ready||gate.nextStagePercent!==stage)blockers.push("source_rollout_stage_no_longer_authorized");if(!predecessor||predecessor.campaignId!==sourceCampaignId)blockers.push("source_rollout_campaign_changed");if(predecessor?.reportId&&String(predecessor.reportId)!==String(sourceReportId))blockers.push("source_rollout_report_changed");decisionAcknowledgement=await evaluateRolloutDecisionAcknowledgement(prisma,gate);appendDecisionAcknowledgementBlockers(blockers,decisionAcknowledgement);}
  const ready=blockers.length===0;return Object.freeze({ready,decision:ready?"go":"no_go",required:true,blockers:Object.freeze([...new Set(blockers)]),sourceCampaignId,sourceReportId,sourceReportCreatedAt,rollout,recoveryTrust,decisionAcknowledgement,acknowledgementChainDiagnostic:compactAcknowledgementChainDiagnostic(decisionAcknowledgement)});
}
module.exports={evaluateSourceEvidenceBinding,sameTimestamp,appendRecoveryTrustBlockers,appendDecisionAcknowledgementBlockers,compactAcknowledgementChainDiagnostic};
