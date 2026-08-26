"use strict";

const { listCampaigns } = require("./campaign-store");
const { evaluateRecoveryTrustChain } = require("./recovery-trust-chain");

function isRecoveryCampaign(campaign) {
  return Boolean(campaign?.approvedScope?.recoveryOfCampaignId);
}

function trustSeverity(gate) {
  if (gate?.ready === true) return "ok";
  const blockers = gate?.blockers || [];
  if (blockers.some((b) => String(b).includes("cycle") || String(b).includes("source_missing") || String(b).includes("stale"))) return "critical";
  return "warning";
}

async function buildRecoveryTrustOverview(prisma, limit = 200) {
  const campaigns = await listCampaigns(prisma, limit);
  const recoveries = campaigns.filter(isRecoveryCampaign);
  const rows = [];
  for (const campaign of recoveries) {
    const gate = await evaluateRecoveryTrustChain(prisma, campaign);
    rows.push(Object.freeze({
      campaignId: campaign.campaignId,
      name: campaign.name || null,
      status: campaign.status,
      sourceCampaignId: campaign.approvedScope?.recoveryOfCampaignId || null,
      ready: gate.ready === true,
      decision: gate.decision,
      severity: trustSeverity(gate),
      depth: gate.depth,
      rootCampaignId: gate.rootCampaignId || null,
      blockers: Object.freeze([...(gate.blockers || [])]),
      chain: gate.chain
    }));
  }
  const healthy = rows.filter((r) => r.ready).length;
  const blocked = rows.length - healthy;
  const critical = rows.filter((r) => r.severity === "critical").length;
  return Object.freeze({
    summary: Object.freeze({ total: rows.length, healthy, blocked, critical }),
    ready: blocked === 0,
    decision: blocked === 0 ? "go" : "no_go",
    campaigns: Object.freeze(rows)
  });
}

module.exports = { isRecoveryCampaign, trustSeverity, buildRecoveryTrustOverview };
