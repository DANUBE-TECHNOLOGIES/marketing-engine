CREATE TABLE IF NOT EXISTS "PublicLead" (
  "id" TEXT PRIMARY KEY,
  "agencyId" INTEGER NOT NULL,
  "agencySiteId" TEXT NOT NULL,
  "siteSlug" TEXT NOT NULL,
  "projectType" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'general',
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "travelDates" TEXT NOT NULL,
  "travellers" TEXT NOT NULL,
  "budget" TEXT,
  "wishes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "erpSyncStatus" TEXT NOT NULL DEFAULT 'DISABLED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PublicLead_agencyId_status_createdAt_idx" ON "PublicLead"("agencyId","status","createdAt");
CREATE INDEX IF NOT EXISTS "PublicLead_agencySiteId_createdAt_idx" ON "PublicLead"("agencySiteId","createdAt");
CREATE INDEX IF NOT EXISTS "PublicLead_email_createdAt_idx" ON "PublicLead"("email","createdAt");
