"use strict";

const { getCampaign } = require("./campaign-store");

const ACTIVE_REGENERATION_STATUSES = Object.freeze(["draft", "approved", "running", "verifying"]);

async function findActiveRegeneration(prisma, sourceCampaignId) {
  const rows = await prisma.$queryRaw`
    SELECT * FROM "PresenceCampaign"
    WHERE "approvedScope"->>'regenerationOfCampaignId' = ${sourceCampaignId}
      AND "status" IN ('draft','approved','running','verifying')
    ORDER BY "createdAt" DESC
    LIMIT 1
  `;
  return rows[0] || null;
}

async function listRegenerationChildren(prisma, sourceCampaignId) {
  return prisma.$queryRaw`
    SELECT "campaignId", "name", "status", "preflightId", "approvedScope", "createdAt", "updatedAt"
    FROM "PresenceCampaign"
    WHERE "approvedScope"->>'regenerationOfCampaignId' = ${sourceCampaignId}
    ORDER BY "createdAt" ASC, "campaignId" ASC
  `;
}

function compactCampaign(campaign) {
  if (!campaign) return null;
  return Object.freeze({
    campaignId: campaign.campaignId,
    name: campaign.name || null,
    status: campaign.status || null,
    preflightId: campaign.preflightId || null,
    createdAt: campaign.createdAt || null,
    regenerationReason: campaign?.approvedScope?.regenerationReason || null,
    regenerationSourceDecision: campaign?.approvedScope?.regenerationSourceDecision || null
  });
}

async function buildRegenerationLineage(prisma, campaign) {
  const sourceCampaignId = campaign?.approvedScope?.regenerationOfCampaignId || null;
  const [source, children] = await Promise.all([
    sourceCampaignId ? getCampaign(prisma, sourceCampaignId) : Promise.resolve(null),
    campaign?.campaignId ? listRegenerationChildren(prisma, campaign.campaignId) : Promise.resolve([])
  ]);
  const activeChild = (children || []).find((row) => ACTIVE_REGENERATION_STATUSES.includes(row.status)) || null;
  return Object.freeze({
    regenerated: Boolean(sourceCampaignId),
    sourceCampaignId,
    source: compactCampaign(source),
    children: Object.freeze((children || []).map(compactCampaign)),
    activeChild: compactCampaign(activeChild),
    hasActiveChild: Boolean(activeChild)
  });
}

module.exports = { ACTIVE_REGENERATION_STATUSES, findActiveRegeneration, listRegenerationChildren, compactCampaign, buildRegenerationLineage };
