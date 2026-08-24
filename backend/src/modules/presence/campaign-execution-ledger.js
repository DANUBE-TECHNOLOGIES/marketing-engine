"use strict";

function jsonOrNull(value) {
  return value == null ? null : JSON.stringify(value);
}

async function getCampaignExecution(prisma, campaignId, campaignIndex) {
  const rows = await prisma.$queryRaw`
    SELECT * FROM "PresenceCampaignExecution"
    WHERE "campaignId" = ${campaignId} AND "campaignIndex" = ${campaignIndex}
    LIMIT 1
  `;
  return rows[0] || null;
}

async function upsertCampaignExecution(prisma, row) {
  await prisma.$executeRaw`
    INSERT INTO "PresenceCampaignExecution"
      ("campaignId", "campaignIndex", "providerKey", "agencyId", "listingId", "operationId", "status", "error", "updatedAt")
    VALUES
      (${row.campaignId}, ${row.campaignIndex}, ${row.providerKey ?? null}, ${row.agencyId ?? null}, ${row.listingId ?? null}, ${row.operationId ?? null}, ${row.status}, CAST(${jsonOrNull(row.error)} AS JSONB), CURRENT_TIMESTAMP)
    ON CONFLICT ("campaignId", "campaignIndex") DO UPDATE SET
      "providerKey" = EXCLUDED."providerKey",
      "agencyId" = EXCLUDED."agencyId",
      "listingId" = COALESCE(EXCLUDED."listingId", "PresenceCampaignExecution"."listingId"),
      "operationId" = COALESCE(EXCLUDED."operationId", "PresenceCampaignExecution"."operationId"),
      "status" = EXCLUDED."status",
      "error" = EXCLUDED."error",
      "updatedAt" = CURRENT_TIMESTAMP
  `;
  return getCampaignExecution(prisma, row.campaignId, row.campaignIndex);
}

async function listCampaignExecutions(prisma, campaignId) {
  return prisma.$queryRaw`
    SELECT * FROM "PresenceCampaignExecution"
    WHERE "campaignId" = ${campaignId}
    ORDER BY "campaignIndex" ASC
  `;
}

function isTerminalExecutionStatus(status) {
  return ["submitted", "verified", "skipped"].includes(status);
}

module.exports = { getCampaignExecution, upsertCampaignExecution, listCampaignExecutions, isTerminalExecutionStatus };
