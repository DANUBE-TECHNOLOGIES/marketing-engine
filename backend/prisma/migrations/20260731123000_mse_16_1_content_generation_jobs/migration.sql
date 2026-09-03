CREATE TABLE IF NOT EXISTS "ContentGenerationJob" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "totalTasks" INTEGER NOT NULL DEFAULT 0,
  "completedTasks" INTEGER NOT NULL DEFAULT 0,
  "failedTasks" INTEGER NOT NULL DEFAULT 0,
  "requestedBy" TEXT,
  "options" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentGenerationJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ContentGenerationJob_tenantId_status_priority_idx" ON "ContentGenerationJob"("tenantId", "status", "priority");
CREATE INDEX IF NOT EXISTS "ContentGenerationJob_campaignId_status_idx" ON "ContentGenerationJob"("campaignId", "status");
CREATE INDEX IF NOT EXISTS "ContentGenerationJob_createdAt_idx" ON "ContentGenerationJob"("createdAt");
DO $$ BEGIN
  ALTER TABLE "ContentGenerationJob" ADD CONSTRAINT "ContentGenerationJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ContentGenerationJob" ADD CONSTRAINT "ContentGenerationJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
