"use strict";

const ALLOWED_TRANSITIONS = Object.freeze({
  draft: new Set(["approved", "failed"]),
  approved: new Set(["running", "failed"]),
  running: new Set(["verifying", "failed"]),
  verifying: new Set(["completed", "failed"]),
  completed: new Set(),
  failed: new Set()
});

function json(value) { return JSON.stringify(value ?? null); }

async function createCampaign(prisma, plan, name = null, options = {}) {
  const pilot = options.pilot === true;
  const preflightId = options.preflightId || null;
  const approvedScope = options.approvedScope || null;
  const approvedPlanFingerprint = options.approvedPlanFingerprint || null;
  await prisma.$executeRaw`
    INSERT INTO "PresenceCampaign" ("campaignId", "name", "status", "policy", "baseline", "plan", "pilot", "preflightId", "approvedScope", "approvedPlanFingerprint")
    VALUES (${plan.campaignId}, ${name}, 'draft', CAST(${json(plan.policy)} AS JSONB), CAST(${json(plan.baseline)} AS JSONB), CAST(${json(plan)} AS JSONB), ${pilot}, ${preflightId}, CAST(${json(approvedScope)} AS JSONB), ${approvedPlanFingerprint})
    ON CONFLICT ("campaignId") DO NOTHING
  `;
  const rows = await prisma.$queryRaw`SELECT * FROM "PresenceCampaign" WHERE "campaignId" = ${plan.campaignId} LIMIT 1`;
  const campaign = rows[0];
  if (campaign) {
    await prisma.$executeRaw`
      INSERT INTO "PresenceCampaignEvent" ("campaignId", "fromStatus", "toStatus", "reason", "payload")
      SELECT ${plan.campaignId}, NULL, 'draft', 'campaign_created', CAST(${json({ selectedCount: plan.selectedCount, pilot, preflightId, approvedScope, approvedPlanFingerprint })} AS JSONB)
      WHERE NOT EXISTS (SELECT 1 FROM "PresenceCampaignEvent" WHERE "campaignId" = ${plan.campaignId})
    `;
  }
  return campaign || null;
}

async function getCampaign(prisma, campaignId) {
  const rows = await prisma.$queryRaw`SELECT * FROM "PresenceCampaign" WHERE "campaignId" = ${campaignId} LIMIT 1`;
  return rows[0] || null;
}

async function listCampaigns(prisma, limit = 50) {
  const safeLimit = Math.max(1, Math.min(Number(limit || 50), 200));
  return prisma.$queryRaw`SELECT * FROM "PresenceCampaign" ORDER BY "createdAt" DESC LIMIT ${safeLimit}`;
}

async function transitionCampaign(prisma, campaignId, toStatus, options = {}) {
  const campaign = await getCampaign(prisma, campaignId);
  if (!campaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  const allowed = ALLOWED_TRANSITIONS[campaign.status] || new Set();
  if (!allowed.has(toStatus)) { const error = new Error(`Transition Presence interdite: ${campaign.status} -> ${toStatus}`); error.status = 409; throw error; }
  if (typeof options.beforeTransition === "function") await options.beforeTransition(campaign, toStatus);
  const timestampColumn = { approved: 'approvedAt', running: 'startedAt', verifying: 'verifyingAt', completed: 'completedAt', failed: 'failedAt' }[toStatus];
  if (timestampColumn) {
    await prisma.$executeRawUnsafe(`UPDATE "PresenceCampaign" SET "status" = $1, "${timestampColumn}" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP WHERE "campaignId" = $2`, toStatus, campaignId);
  } else {
    await prisma.$executeRaw`UPDATE "PresenceCampaign" SET "status" = ${toStatus}, "updatedAt" = CURRENT_TIMESTAMP WHERE "campaignId" = ${campaignId}`;
  }
  await prisma.$executeRaw`
    INSERT INTO "PresenceCampaignEvent" ("campaignId", "fromStatus", "toStatus", "reason", "payload")
    VALUES (${campaignId}, ${campaign.status}, ${toStatus}, ${options.reason || null}, CAST(${json(options.payload)} AS JSONB))
  `;
  return getCampaign(prisma, campaignId);
}

async function listCampaignEvents(prisma, campaignId) {
  return prisma.$queryRaw`SELECT * FROM "PresenceCampaignEvent" WHERE "campaignId" = ${campaignId} ORDER BY "createdAt" ASC, "id" ASC`;
}

module.exports = { ALLOWED_TRANSITIONS, createCampaign, getCampaign, listCampaigns, transitionCampaign, listCampaignEvents };
