"use strict";

const { getCampaign } = require("./campaign-store");
const { evaluateRecoveryStabilizationSnapshotBinding } = require("./campaign-recovery-stabilization-snapshot");

async function evaluateRecoveryTrustChain(prisma, campaign, options = {}) {
  const maxDepth = Math.max(1, Math.min(Number(options.maxDepth || 20), 100));
  const visited = new Set();
  const chain = [];
  const blockers = [];
  let current = campaign;
  let depth = 0;

  while (current?.approvedScope?.recoveryOfCampaignId) {
    if (depth >= maxDepth) { blockers.push("recovery_trust_chain_depth_exceeded"); break; }
    const currentId = String(current.campaignId || "");
    if (currentId && visited.has(currentId)) { blockers.push("recovery_trust_chain_cycle_detected"); break; }
    if (currentId) visited.add(currentId);

    const sourceCampaignId = current.approvedScope.recoveryOfCampaignId;
    const expected = {
      snapshotId: current.approvedScope.recoveryStabilizationSnapshotId || null,
      evidenceSignature: current.approvedScope.recoveryStabilizationEvidenceSignature || null
    };
    if (!expected.snapshotId || !expected.evidenceSignature) blockers.push("recovery_trust_chain_binding_missing");

    const binding = await evaluateRecoveryStabilizationSnapshotBinding(prisma, sourceCampaignId, expected);
    chain.push(Object.freeze({ campaignId: current.campaignId || null, sourceCampaignId, depth, ready: binding.ready, blockers: binding.blockers, snapshotId: binding.snapshot?.snapshotId || null }));
    blockers.push(...(binding.blockers || []));
    if (!binding.ready) break;

    const sourceCampaign = await getCampaign(prisma, sourceCampaignId);
    if (!sourceCampaign) { blockers.push("recovery_trust_chain_source_missing"); break; }
    current = sourceCampaign;
    depth += 1;
  }

  return Object.freeze({
    ready: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    depth: chain.length,
    rootCampaignId: current?.campaignId || campaign?.campaignId || null,
    blockers: Object.freeze([...new Set(blockers)]),
    chain: Object.freeze(chain)
  });
}

module.exports = { evaluateRecoveryTrustChain };
