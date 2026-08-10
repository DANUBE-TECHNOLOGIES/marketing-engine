CREATE TABLE "SeoPrompt" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL,
  "channel" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'fr-FR', "version" INTEGER NOT NULL DEFAULT 1,
  "status" TEXT NOT NULL DEFAULT 'active', "template" TEXT NOT NULL, "variables" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "SeoPrompt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeoGenerationJob" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "campaignId" TEXT, "promptId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'queued', "channel" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'fr-FR',
  "provider" TEXT NOT NULL DEFAULT 'deterministic', "input" JSONB NOT NULL DEFAULT '{}', "output" JSONB,
  "error" TEXT, "requestedBy" TEXT, "startedAt" TIMESTAMP(3), "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoGenerationJob_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeoContent" (
  "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "campaignId" TEXT, "generationJobId" TEXT,
  "channel" TEXT NOT NULL, "locale" TEXT NOT NULL DEFAULT 'fr-FR', "slug" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft', "title" TEXT NOT NULL, "excerpt" TEXT,
  "body" JSONB NOT NULL DEFAULT '{}', "seo" JSONB NOT NULL DEFAULT '{}', "schemaOrg" JSONB,
  "qualityScore" INTEGER, "revision" INTEGER NOT NULL DEFAULT 1, "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoContent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeoPrompt_tenantId_key_version_key" ON "SeoPrompt"("tenantId", "key", "version");
CREATE INDEX "SeoPrompt_tenantId_status_channel_idx" ON "SeoPrompt"("tenantId", "status", "channel");
CREATE INDEX "SeoGenerationJob_tenantId_status_createdAt_idx" ON "SeoGenerationJob"("tenantId", "status", "createdAt");
CREATE INDEX "SeoGenerationJob_campaignId_status_idx" ON "SeoGenerationJob"("campaignId", "status");
CREATE INDEX "SeoGenerationJob_promptId_idx" ON "SeoGenerationJob"("promptId");
CREATE UNIQUE INDEX "SeoContent_tenantId_channel_slug_revision_key" ON "SeoContent"("tenantId", "channel", "slug", "revision");
CREATE INDEX "SeoContent_tenantId_status_channel_idx" ON "SeoContent"("tenantId", "status", "channel");
CREATE INDEX "SeoContent_campaignId_status_idx" ON "SeoContent"("campaignId", "status");
CREATE INDEX "SeoContent_generationJobId_idx" ON "SeoContent"("generationJobId");
ALTER TABLE "SeoPrompt" ADD CONSTRAINT "SeoPrompt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeoGenerationJob" ADD CONSTRAINT "SeoGenerationJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeoGenerationJob" ADD CONSTRAINT "SeoGenerationJob_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoGenerationJob" ADD CONSTRAINT "SeoGenerationJob_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "SeoPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SeoContent" ADD CONSTRAINT "SeoContent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeoContent" ADD CONSTRAINT "SeoContent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "MarketingCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoContent" ADD CONSTRAINT "SeoContent_generationJobId_fkey" FOREIGN KEY ("generationJobId") REFERENCES "SeoGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;
