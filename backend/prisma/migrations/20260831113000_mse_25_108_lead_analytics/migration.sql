ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "contactedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "convertedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PublicLead_createdAt_idx" ON "PublicLead"("createdAt");
CREATE INDEX IF NOT EXISTS "PublicLead_agencyId_createdAt_idx" ON "PublicLead"("agencyId","createdAt");
