"use strict";

const { listCampaigns } = require("./campaign-store");
const { getFrozenCampaignReport } = require("./campaign-report-store");
const { evaluatePilotOutcome } = require("./pilot-outcome");

const ROLLOUT_STAGES = Object.freeze([25, 50, 100]);

function stageTargetAgencyCount(totalAgencies, stagePercent) {
  const total = Math.max(0, Number(totalAgencies || 0));
  const stage = ROLLOUT_STAGES.includes(Number(stagePercent)) ? Number(stagePercent) : 25;
  return total ? Math.max(1, Math.ceil((total * stage) / 100)) : 0;
}

function campaignAgencyCount(campaign) {
  const ids = campaign?.approvedScope?.agencyIds;
  return Array.isArray(ids) ? new Set(ids.map(Number).filter(Number.isInteger)).size : 0;
}

function campaignStage(campaign) {
  const explicit = Number(campaign?.approvedScope?.rolloutStage || 0);
  return ROLLOUT_STAGES.includes(explicit) ? explicit : null;
}

async function evidenceForCampaign(prisma, campaign) {
  if (!campaign || campaign.status !== "completed" || campaign.pilot !== true) return null;
  const frozen = await getFrozenCampaignReport(prisma, campaign.campaignId);
  if (!frozen?.report) return null;
  const criticalPropagationAlerts = Number(frozen.report?.pilotEvidence?.criticalPropagationAlerts ?? 0);
  const rollout = evaluatePilotOutcome(frozen.report, { criticalPropagationAlerts });
  if (!rollout.readyForNetworkRollout) return null;
  if (frozen.report?.predecessorComparison?.required === true && frozen.report.predecessorComparison.ready !== true) return null;
  return { campaign, frozen, rollout };
}

async function findStageEvidence(prisma, totalAgencies, stagePercent) {
  const campaigns = await listCampaigns(prisma, 200);
  const target = stageTargetAgencyCount(totalAgencies, stagePercent);
  for (const campaign of campaigns) {
    if (campaign.pilot !== true || campaign.status !== "completed") continue;
    const explicitStage = campaignStage(campaign);
    const count = campaignAgencyCount(campaign);
    const qualifies = explicitStage === stagePercent || (stagePercent === 25 && explicitStage == null && count >= target && count <= 3);
    if (!qualifies || count < target) continue;
    const evidence = await evidenceForCampaign(prisma, campaign);
    if (evidence) return { ...evidence, stagePercent, targetAgencyCount: target, actualAgencyCount: count };
  }
  return null;
}

async function evaluateNetworkRolloutGate(prisma, totalAgencies) {
  const total = Math.max(0, Number(totalAgencies || 0));
  if (!total) return Object.freeze({ ready: false, decision: "no_go", nextStagePercent: 25, blockers: Object.freeze(["network_agencies_missing"]), stages: Object.freeze([]) });

  const stage25 = await findStageEvidence(prisma, total, 25);
  if (!stage25) return Object.freeze({ ready: false, decision: "no_go", nextStagePercent: 25, blockers: Object.freeze(["rollout_25_evidence_missing"]), stages: Object.freeze([]) });

  const stage50 = await findStageEvidence(prisma, total, 50);
  if (!stage50) return Object.freeze({ ready: true, decision: "go", nextStagePercent: 50, maxAgencies: stageTargetAgencyCount(total, 50), blockers: Object.freeze([]), stages: Object.freeze([{ stagePercent: 25, campaignId: stage25.campaign.campaignId, agencyCount: stage25.actualAgencyCount, reportCreatedAt: stage25.frozen.createdAt }]) });

  const stage100 = await findStageEvidence(prisma, total, 100);
  if (!stage100) return Object.freeze({ ready: true, decision: "go", nextStagePercent: 100, maxAgencies: stageTargetAgencyCount(total, 100), blockers: Object.freeze([]), stages: Object.freeze([{ stagePercent: 25, campaignId: stage25.campaign.campaignId, agencyCount: stage25.actualAgencyCount, reportCreatedAt: stage25.frozen.createdAt }, { stagePercent: 50, campaignId: stage50.campaign.campaignId, agencyCount: stage50.actualAgencyCount, reportCreatedAt: stage50.frozen.createdAt }]) });

  return Object.freeze({ ready: true, decision: "complete", nextStagePercent: null, maxAgencies: total, blockers: Object.freeze([]), stages: Object.freeze([{ stagePercent: 25, campaignId: stage25.campaign.campaignId, agencyCount: stage25.actualAgencyCount, reportCreatedAt: stage25.frozen.createdAt }, { stagePercent: 50, campaignId: stage50.campaign.campaignId, agencyCount: stage50.actualAgencyCount, reportCreatedAt: stage50.frozen.createdAt }, { stagePercent: 100, campaignId: stage100.campaign.campaignId, agencyCount: stage100.actualAgencyCount, reportCreatedAt: stage100.frozen.createdAt }]) });
}

module.exports = { ROLLOUT_STAGES, stageTargetAgencyCount, campaignAgencyCount, campaignStage, evidenceForCampaign, findStageEvidence, evaluateNetworkRolloutGate };
