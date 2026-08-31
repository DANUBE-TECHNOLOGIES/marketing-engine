ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "sourcePage" TEXT,
  ADD COLUMN IF NOT EXISTS "sourcePath" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceReferrer" TEXT,
  ADD COLUMN IF NOT EXISTS "utmSource" TEXT,
  ADD COLUMN IF NOT EXISTS "utmMedium" TEXT,
  ADD COLUMN IF NOT EXISTS "utmCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "utmContent" TEXT,
  ADD COLUMN IF NOT EXISTS "utmTerm" TEXT;

CREATE INDEX IF NOT EXISTS "PublicLead_source_createdAt_idx"
  ON "PublicLead"("source", "createdAt");

CREATE INDEX IF NOT EXISTS "PublicLead_projectType_createdAt_idx"
  ON "PublicLead"("projectType", "createdAt");
