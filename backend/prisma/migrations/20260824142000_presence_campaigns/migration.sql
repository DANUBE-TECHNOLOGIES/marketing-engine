CREATE TABLE IF NOT EXISTS "PresenceCampaign" (
  "id" BIGSERIAL PRIMARY KEY,
  "campaignId" TEXT NOT NULL UNIQUE,
  "name" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "policy" JSONB NOT NULL,
  "baseline" JSONB NOT NULL,
  "plan" JSONB NOT NULL,
  "approvedAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "verifyingAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PresenceCampaign_status_idx" ON "PresenceCampaign"("status");
CREATE INDEX IF NOT EXISTS "PresenceCampaign_createdAt_idx" ON "PresenceCampaign"("createdAt");

CREATE TABLE IF NOT EXISTS "PresenceCampaignEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "campaignId" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT NOT NULL,
  "reason" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PresenceCampaignEvent_campaignId_idx" ON "PresenceCampaignEvent"("campaignId", "createdAt");
