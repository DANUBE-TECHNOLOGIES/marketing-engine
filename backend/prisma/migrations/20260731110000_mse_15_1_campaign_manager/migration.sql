ALTER TABLE "MarketingCampaign"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "CampaignAgency" (
  "campaignId" TEXT NOT NULL,
  "agencyId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignAgency_pkey" PRIMARY KEY ("campaignId", "agencyId")
);
CREATE INDEX IF NOT EXISTS "CampaignAgency_agencyId_idx" ON "CampaignAgency"("agencyId");

CREATE TABLE IF NOT EXISTS "CampaignDestination" (
  "campaignId" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignDestination_pkey" PRIMARY KEY ("campaignId", "destinationId")
);
CREATE INDEX IF NOT EXISTS "CampaignDestination_destinationId_idx" ON "CampaignDestination"("destinationId");

CREATE TABLE IF NOT EXISTS "CampaignTask" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "channel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignTask_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignTask_campaignId_key_key" ON "CampaignTask"("campaignId", "key");
CREATE INDEX IF NOT EXISTS "CampaignTask_campaignId_status_idx" ON "CampaignTask"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "CampaignTask_type_status_idx" ON "CampaignTask"("type", "status");

CREATE TABLE IF NOT EXISTS "CampaignAsset" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "taskId" TEXT,
  "type" TEXT NOT NULL,
  "channel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "title" TEXT,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CampaignAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CampaignAsset_campaignId_status_idx" ON "CampaignAsset"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "CampaignAsset_type_channel_idx" ON "CampaignAsset"("type", "channel");
CREATE INDEX IF NOT EXISTS "CampaignAsset_taskId_idx" ON "CampaignAsset"("taskId");

DO $$ BEGIN
  ALTER TABLE "CampaignAgency" ADD CONSTRAINT "CampaignAgency_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignAgency" ADD CONSTRAINT "CampaignAgency_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignDestination" ADD CONSTRAINT "CampaignDestination_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignDestination" ADD CONSTRAINT "CampaignDestination_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignTask" ADD CONSTRAINT "CampaignTask_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CampaignAsset" ADD CONSTRAINT "CampaignAsset_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
