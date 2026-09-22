CREATE TABLE "GroupCampaignSettings" (
  "id" TEXT NOT NULL,
  "campaignSlug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "objectiveTravellers" INTEGER,
  "minimumTravellers" INTEGER,
  "decisionDeadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GroupCampaignSettings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GroupCampaignSettings_objectiveTravellers_check" CHECK ("objectiveTravellers" IS NULL OR "objectiveTravellers" >= 0),
  CONSTRAINT "GroupCampaignSettings_minimumTravellers_check" CHECK ("minimumTravellers" IS NULL OR "minimumTravellers" >= 0),
  CONSTRAINT "GroupCampaignSettings_status_check" CHECK ("status" IN ('DRAFT','OPEN','GUARANTEED','FULL','CLOSED'))
);
CREATE UNIQUE INDEX "GroupCampaignSettings_campaignSlug_key" ON "GroupCampaignSettings"("campaignSlug");
CREATE INDEX "GroupCampaignSettings_status_idx" ON "GroupCampaignSettings"("status");
CREATE INDEX "GroupCampaignSettings_decisionDeadline_idx" ON "GroupCampaignSettings"("decisionDeadline");
