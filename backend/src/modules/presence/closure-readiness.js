"use strict";

const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluateNetworkRolloutGate } = require("./network-rollout-gate");
const { evaluateRolloutDecisionAcknowledgement } = require("./rollout-decision-ack-gate");

function unique(values = []) { return Object.freeze([...new Set(values.filter(Boolean))]); }

function structuralClosureBlockers(deployment = {}) {
  const blockers = [];
  if (deployment?.migrations?.ready !== true) blockers.push("presence_migrations");
  const checks = deployment?.operational?.checks || [];
  if (checks.find((item) => item.key === "directory_schema")?.ok !== true) blockers.push("directory_schema");
  if (checks.find((item) => item.key === "presence_storage")?.ok !== true) blockers.push("presence_storage");
  if (deployment?.catalog?.ready !== true) blockers.push("provider_catalog");
  return unique(blockers);
}

function buildResidualDebt({ deployment = {}, acknowledgement = {} } = {}) {
  const debt = [];
  const operational = deployment.operational || {};
  if (operational.readyForDiscovery !== true) debt.push("dataforseo_discovery_optional");
  const apple = (operational.checks || []).find((item) => item.key === "apple_provider");
  if (apple && apple.ok !== true) debt.push("apple_provider_optional");
  const maturity = acknowledgement.acknowledgementSealingMaturity || {};
  if (maturity.versioned === true && maturity.fullyExplicit !== true) debt.push("acknowledgement_chain_legacy_sealing");
  return unique(debt);
}

function buildActivationBlockers({ deployment = {}, rolloutGate = {}, acknowledgement = {} } = {}) {
  return unique([
    ...(deployment?.pilot?.blockers || []),
    ...(rolloutGate?.blockers || []),
    ...(acknowledgement?.blockers || [])
  ]);
}

async function buildPresenceClosureReadiness(prisma, env = process.env) {
  const deployment = await buildDeploymentReadiness(prisma, env);
  const rolloutGate = await evaluateNetworkRolloutGate(prisma, deployment?.network?.agencyCount || 0);
  const acknowledgement = await evaluateRolloutDecisionAcknowledgement(prisma, rolloutGate);
  const closureBlockers = structuralClosureBlockers(deployment);
  const activationBlockers = buildActivationBlockers({ deployment, rolloutGate, acknowledgement });
  const residualDebt = buildResidualDebt({ deployment, acknowledgement });
  const codeReadyForClosure = closureBlockers.length === 0;
  const readOnlyReady = deployment?.pilot?.readyForReadOnlyPreflight === true;
  const googlePilotActivableNow = deployment?.pilot?.readyForGooglePilot === true && acknowledgement.ready === true;
  const rolloutPromotableNow = rolloutGate?.ready === true && acknowledgement.ready === true;

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    decision: codeReadyForClosure ? "ready_for_closure" : "closure_blocked",
    codeReadyForClosure,
    readOnlyReady,
    googlePilotActivableNow,
    rolloutPromotableNow,
    closureBlockers,
    activationBlockers,
    residualDebt,
    invariants: Object.freeze({
      auditExternalWrite: false,
      closureIndependentFromGoogleWriteToggle: true,
      activationRequiresRuntimeReadiness: true,
      promotionRequiresAcknowledgementGate: true
    }),
    deployment,
    rolloutGate,
    acknowledgement: Object.freeze({
      ready: acknowledgement.ready === true,
      decision: acknowledgement.decision || "no_go",
      blockers: acknowledgement.blockers || [],
      drift: acknowledgement.drift || null,
      acknowledgementSealingMaturity: acknowledgement.acknowledgementSealingMaturity || null,
      acknowledgementSealingPolicy: acknowledgement.acknowledgementSealingPolicy || null,
      acknowledgementChainAudit: acknowledgement.acknowledgementChainAudit || null
    })
  });
}

module.exports = { unique, structuralClosureBlockers, buildResidualDebt, buildActivationBlockers, buildPresenceClosureReadiness };
