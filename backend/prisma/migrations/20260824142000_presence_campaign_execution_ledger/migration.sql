CREATE TABLE IF NOT EXISTS "PresenceCampaignExecution" (
  "id" BIGSERIAL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "campaignIndex" INTEGER NOT NULL,
  "providerKey" TEXT,
  "agencyId" INTEGER,
  "listingId" INTEGER,
  "operationId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "error" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("campaignId", "campaignIndex")
);

CREATE INDEX IF NOT EXISTS "PresenceCampaignExecution_campaignId_status_idx"
  ON "PresenceCampaignExecution" ("campaignId", "status");
CREATE INDEX IF NOT EXISTS "PresenceCampaignExecution_operationId_idx"
  ON "PresenceCampaignExecution" ("operationId");
