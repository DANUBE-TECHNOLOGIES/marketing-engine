ALTER TABLE "PresenceCampaign"
  ADD COLUMN IF NOT EXISTS "pilot" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "preflightId" TEXT,
  ADD COLUMN IF NOT EXISTS "approvedScope" JSONB,
  ADD COLUMN IF NOT EXISTS "approvedPlanFingerprint" TEXT;

CREATE INDEX IF NOT EXISTS "PresenceCampaign_preflightId_idx" ON "PresenceCampaign"("preflightId");
