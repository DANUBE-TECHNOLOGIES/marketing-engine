"use strict";

const { listCampaigns } = require("./campaign-store");
const { evaluateRecoveryTrustChain } = require("./recovery-trust-chain");

function isRecoveryCampaign(campaign) { return Boolean(campaign?.approvedScope?.recoveryOfCampaignId); }
function trustSeverity(gate) {
  if (gate?.ready === true) return "ok";
  const blockers = gate?.blockers || [];
  if (blockers.some((b) => String(b).includes("cycle") || String(b).includes("source_missing") || String(b).includes("stale"))) return "critical";
  return "warning";
}
function rolloutTrustBlockers(overview) {
  const critical = overview?.campaigns?.filter((row) => row.severity === "critical") || [];
  if (!critical.length) return Object.freeze([]);
  return Object.freeze(["critical_recovery_trust_blocks_rollout", ...critical.map((row) => `critical_recovery:${row.campaignId}`)]);
}
async function buildRecoveryTrustOverview(prisma, limit = 200) {
  const campaigns = await listCampaigns(prisma, limit);
  const recoveries = campaigns.filter(isRecoveryCampaign);
  const rows = [];
  for (const campaign of recoveries) {
    const gate = await evaluateRecoveryTrustChain(prisma, campaign);
    rows.push(Object.freeze({ campaignId:campaign.campaignId,name:campaign.name||null,status:campaign.status,sourceCampaignId:campaign.approvedScope?.recoveryOfCampaignId||null,ready:gate.ready===true,decision:gate.decision,severity:trustSeverity(gate),depth:gate.depth,rootCampaignId:gate.rootCampaignId||null,blockers:Object.freeze([...(gate.blockers||[])]),chain:gate.chain }));
  }
  const healthy=rows.filter((r)=>r.ready).length, blocked=rows.length-healthy, critical=rows.filter((r)=>r.severity==="critical").length;
  const overview={summary:Object.freeze({total:rows.length,healthy,blocked,critical}),ready:blocked===0,decision:blocked===0?"go":"no_go",campaigns:Object.freeze(rows)};
  return Object.freeze({...overview,rolloutBlockers:rolloutTrustBlockers(overview)});
}
module.exports={isRecoveryCampaign,trustSeverity,rolloutTrustBlockers,buildRecoveryTrustOverview};
