CREATE TABLE "Brand" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "legalName" TEXT,
  "logoUrl" TEXT,
  "logoDarkUrl" TEXT,
  "faviconUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0B5FFF',
  "secondaryColor" TEXT NOT NULL DEFAULT '#102A43',
  "accentColor" TEXT NOT NULL DEFAULT '#FFB703',
  "backgroundColor" TEXT NOT NULL DEFAULT '#FFFFFF',
  "textColor" TEXT NOT NULL DEFAULT '#102A43',
  "fontFamily" TEXT NOT NULL DEFAULT 'Inter, Arial, sans-serif',
  "domain" TEXT,
  "supportEmail" TEXT,
  "supportPhone" TEXT,
  "address" TEXT,
  "socialLinks" JSONB,
  "emailSettings" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Brand_tenantId_key" ON "Brand"("tenantId");
CREATE UNIQUE INDEX "Brand_domain_key" ON "Brand"("domain");
CREATE INDEX "Brand_displayName_idx" ON "Brand"("displayName");

ALTER TABLE "Brand"
ADD CONSTRAINT "Brand_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Brand" (
  "id", "tenantId", "displayName", "legalName", "primaryColor", "secondaryColor",
  "accentColor", "backgroundColor", "textColor", "fontFamily", "socialLinks",
  "emailSettings", "metadata", "updatedAt"
)
SELECT
  'brand_' || "id", "id", "name", 'SAS DANUBE', '#0B5FFF', '#102A43',
  '#FFB703', '#FFFFFF', '#102A43', 'Inter, Arial, sans-serif', '{}'::jsonb,
  '{}'::jsonb, '{"source":"mse-13.0-migration"}'::jsonb, CURRENT_TIMESTAMP
FROM "Tenant"
ON CONFLICT ("tenantId") DO NOTHING;
