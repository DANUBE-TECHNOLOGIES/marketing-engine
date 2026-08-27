"use strict";

function json(value) {
  return JSON.stringify(value ?? null);
}

async function getFrozenCampaignReport(prisma, campaignId) {
  const rows = await prisma.$queryRaw`
    SELECT "id", "campaignId", "report", "createdAt"
    FROM "PresenceCampaignReport"
    WHERE "campaignId" = ${campaignId}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function freezeCampaignReport(prisma, campaignId, report) {
  await prisma.$executeRaw`
    INSERT INTO "PresenceCampaignReport" ("campaignId", "report")
    VALUES (${campaignId}, CAST(${json(report)} AS JSONB))
    ON CONFLICT ("campaignId") DO NOTHING
  `;
  return getFrozenCampaignReport(prisma, campaignId);
}

module.exports = { getFrozenCampaignReport, freezeCampaignReport };
