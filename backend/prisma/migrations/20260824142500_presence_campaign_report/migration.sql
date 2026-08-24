CREATE TABLE IF NOT EXISTS "PresenceCampaignReport" (
  "id" SERIAL PRIMARY KEY,
  "campaignId" TEXT NOT NULL UNIQUE,
  "report" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PresenceCampaignReport_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "PresenceCampaign"("campaignId") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PresenceCampaignReport_createdAt_idx"
  ON "PresenceCampaignReport"("createdAt");
