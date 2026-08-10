-- MSE-12.2 Tenant Propagation Engine
INSERT INTO "Tenant" ("id", "name", "slug", "status", "plan", "settings", "createdAt", "updatedAt")
VALUES ('tenant_mondescale', 'Mondescale', 'mondescale', 'active', 'enterprise', '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Agency" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'mondescale') WHERE "tenantId" IS NULL;
ALTER TABLE "Agency" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "AgencySite" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MiniSite" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Destination" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "MarketingCampaign" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "SeoAutopilotRun" ADD COLUMN "tenantId" TEXT;

UPDATE "AgencySite" s SET "tenantId" = a."tenantId" FROM "Agency" a WHERE s."agencyId" = a."id";
UPDATE "MiniSite" s SET "tenantId" = COALESCE((SELECT a."tenantId" FROM "Agency" a WHERE a."id"::text = s."agencyId"), (SELECT "id" FROM "Tenant" WHERE "slug"='mondescale'));
UPDATE "Destination" SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug"='mondescale');
UPDATE "MarketingCampaign" c SET "tenantId" = COALESCE((SELECT s."tenantId" FROM "AgencySite" s WHERE s."id" = c."siteId"), (SELECT "id" FROM "Tenant" WHERE "slug"='mondescale'));
UPDATE "SeoAutopilotRun" r SET "tenantId" = COALESCE((SELECT s."tenantId" FROM "AgencySite" s WHERE s."id" = r."siteId"), (SELECT "id" FROM "Tenant" WHERE "slug"='mondescale'));

ALTER TABLE "AgencySite" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MiniSite" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "Destination" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "MarketingCampaign" ALTER COLUMN "tenantId" SET NOT NULL;
ALTER TABLE "SeoAutopilotRun" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "AgencySite" DROP CONSTRAINT IF EXISTS "AgencySite_slug_key";
ALTER TABLE "AgencySite" DROP CONSTRAINT IF EXISTS "AgencySite_basePath_key";
ALTER TABLE "MiniSite" DROP CONSTRAINT IF EXISTS "MiniSite_slug_key";
ALTER TABLE "Destination" DROP CONSTRAINT IF EXISTS "Destination_slug_key";

CREATE UNIQUE INDEX "AgencySite_tenantId_slug_key" ON "AgencySite"("tenantId", "slug");
CREATE UNIQUE INDEX "AgencySite_tenantId_basePath_key" ON "AgencySite"("tenantId", "basePath");
CREATE UNIQUE INDEX "MiniSite_tenantId_slug_key" ON "MiniSite"("tenantId", "slug");
CREATE UNIQUE INDEX "Destination_tenantId_slug_key" ON "Destination"("tenantId", "slug");
CREATE INDEX "AgencySite_tenantId_idx" ON "AgencySite"("tenantId");
CREATE INDEX "MiniSite_tenantId_idx" ON "MiniSite"("tenantId");
CREATE INDEX "Destination_tenantId_idx" ON "Destination"("tenantId");
CREATE INDEX "MarketingCampaign_tenantId_idx" ON "MarketingCampaign"("tenantId");
CREATE INDEX "SeoAutopilotRun_tenantId_idx" ON "SeoAutopilotRun"("tenantId");
CREATE INDEX "SeoAutopilotRun_tenantId_siteId_status_idx" ON "SeoAutopilotRun"("tenantId", "siteId", "status");

ALTER TABLE "AgencySite" ADD CONSTRAINT "AgencySite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MiniSite" ADD CONSTRAINT "MiniSite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Destination" ADD CONSTRAINT "Destination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SeoAutopilotRun" ADD CONSTRAINT "SeoAutopilotRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
