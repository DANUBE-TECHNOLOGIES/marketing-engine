ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "pipelineStage" TEXT NOT NULL DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "lostReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lostAt" TIMESTAMP(3);

UPDATE "PublicLead"
SET "pipelineStage" = CASE
  WHEN "status" = 'CONVERTED' THEN 'WON'
  WHEN "status" = 'CLOSED' THEN 'LOST'
  WHEN "status" = 'CONTACTED' THEN 'IN_PROGRESS'
  ELSE 'NEW'
END;

CREATE INDEX IF NOT EXISTS "PublicLead_pipelineStage_priority_createdAt_idx"
  ON "PublicLead"("pipelineStage", "priority", "createdAt");

CREATE INDEX IF NOT EXISTS "PublicLead_agencyId_pipelineStage_idx"
  ON "PublicLead"("agencyId", "pipelineStage");