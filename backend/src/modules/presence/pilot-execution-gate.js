"use strict";

const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { evaluatePilotCampaignBinding } = require("./pilot-campaign-binding");

async function evaluatePilotExecutionGate(prisma, campaign) {
  if (!campaign?.pilot) return Object.freeze({ ready: true, decision: "go", pilot: false, blockers: Object.freeze([]), warnings: Object.freeze([]) });
  const [preflight, currentReadiness] = await Promise.all([
    getLatestDeploymentPreflight(prisma),
    buildDeploymentReadiness(prisma)
  ]);
  const binding = evaluatePilotCampaignBinding(campaign);
  const activation = evaluatePilotActivationGate({ preflight, currentReadiness });
  const blockers = [...new Set([...(binding.blockers || []), ...(activation.blockers || [])])];
  if (campaign.preflightId !== preflight?.preflightId) blockers.push("pilot_campaign_preflight_mismatch");
  const ready = binding.ready === true && activation.ready === true && campaign.preflightId === preflight?.preflightId;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    pilot: true,
    preflightId: campaign.preflightId || null,
    latestPreflightId: preflight?.preflightId || null,
    binding,
    activation,
    blockers: Object.freeze([...new Set(blockers)]),
    warnings: Object.freeze([...(activation.warnings || [])])
  });
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

module.exports = { evaluatePilotExecutionGate, assertPilotExecutionReady };
