"use strict";

const { listCampaigns } = require("./campaign-store");
const { getFrozenCampaignReport } = require("./campaign-report-store");
const { evaluatePilotOutcome } = require("./pilot-outcome");

function isCanaryCampaign(campaign) {
  const scope = campaign?.approvedScope || {};
  const agencyIds = Array.isArray(scope.agencyIds) ? scope.agencyIds : [];
  return campaign?.pilot === true
    && campaign?.status === "completed"
    && agencyIds.length === 1
    && Number(scope.maxItems || 0) === 1
    && scope.allowSensitive !== true
    && Array.isArray(scope.providerKeys)
    && scope.providerKeys.length === 1
    && scope.providerKeys[0] === "google_business_profile";
}

async function findLatestCompletedCanary(prisma) {
  const campaigns = await listCampaigns(prisma, 100);
  for (const campaign of campaigns) {
    if (!isCanaryCampaign(campaign)) continue;
    const frozen = await getFrozenCampaignReport(prisma, campaign.campaignId);
    if (frozen?.report) return { campaign, frozen };
  }
  return null;
}

async function evaluatePilotExtensionGate(prisma) {
  const evidence = await findLatestCompletedCanary(prisma);
  if (!evidence) return Object.freeze({ ready: false, decision: "no_go", blockers: Object.freeze(["completed_canary_frozen_report_missing"]), warnings: Object.freeze([]), canaryCampaignId: null, reportId: null, reportCreatedAt: null, rollout: null });
  const criticalPropagationAlerts = Number(evidence.frozen.report?.pilotEvidence?.criticalPropagationAlerts ?? 0);
  const rollout = evaluatePilotOutcome(evidence.frozen.report, { criticalPropagationAlerts });
  const blockers = [...rollout.blockers];
  if (evidence.frozen.report?.execution?.total !== 1) blockers.push("canary_execution_count_invalid");
  if (evidence.frozen.report?.execution?.verified !== 1) blockers.push("canary_not_fully_verified");
  const ready = blockers.length === 0;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    blockers: Object.freeze([...new Set(blockers)]),
    warnings: Object.freeze(rollout.warnings || []),
    canaryCampaignId: evidence.campaign.campaignId,
    reportId: evidence.frozen.id || null,
    reportCreatedAt: evidence.frozen.createdAt,
    rollout
  });
}

module.exports = { isCanaryCampaign, findLatestCompletedCanary, evaluatePilotExtensionGate };
