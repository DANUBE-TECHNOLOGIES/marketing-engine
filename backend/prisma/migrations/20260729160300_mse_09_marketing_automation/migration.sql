CREATE TABLE "MarketingCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "siteId" TEXT,
    "sourcePageId" TEXT,
    "destinationSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "objective" TEXT NOT NULL DEFAULT 'traffic',
    "scheduledAt" TIMESTAMP(3),
    "source" JSONB NOT NULL,
    "metadata" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MarketingPublication" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "payload" JSONB NOT NULL,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketingPublication_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MarketingCampaign_siteId_idx" ON "MarketingCampaign"("siteId");
CREATE INDEX "MarketingCampaign_sourcePageId_idx" ON "MarketingCampaign"("sourcePageId");
CREATE INDEX "MarketingCampaign_destinationSlug_idx" ON "MarketingCampaign"("destinationSlug");
CREATE INDEX "MarketingCampaign_status_scheduledAt_idx" ON "MarketingCampaign"("status", "scheduledAt");
CREATE UNIQUE INDEX "MarketingPublication_campaignId_channel_key" ON "MarketingPublication"("campaignId", "channel");
CREATE INDEX "MarketingPublication_channel_status_idx" ON "MarketingPublication"("channel", "status");
CREATE INDEX "MarketingPublication_status_scheduledAt_idx" ON "MarketingPublication"("status", "scheduledAt");
ALTER TABLE "MarketingPublication" ADD CONSTRAINT "MarketingPublication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
