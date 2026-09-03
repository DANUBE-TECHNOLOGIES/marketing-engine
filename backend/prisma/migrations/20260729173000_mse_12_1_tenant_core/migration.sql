CREATE TABLE "Tenant" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "plan" TEXT NOT NULL DEFAULT 'starter',
  "settings" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");
CREATE INDEX "Tenant_plan_idx" ON "Tenant"("plan");

ALTER TABLE "Agency" ADD COLUMN "tenantId" TEXT;

INSERT INTO "Tenant" ("id", "name", "slug", "status", "plan", "settings", "createdAt", "updatedAt")
VALUES ('tenant_mondescale', 'Mondescale', 'mondescale', 'active', 'enterprise', '{}'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

UPDATE "Agency"
SET "tenantId" = (SELECT "id" FROM "Tenant" WHERE "slug" = 'mondescale' LIMIT 1)
WHERE "tenantId" IS NULL;

DROP INDEX IF EXISTS "Agency_name_city_key";
CREATE UNIQUE INDEX "Agency_tenantId_name_city_key" ON "Agency"("tenantId", "name", "city");
CREATE INDEX "Agency_tenantId_idx" ON "Agency"("tenantId");

ALTER TABLE "Agency"
ADD CONSTRAINT "Agency_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
