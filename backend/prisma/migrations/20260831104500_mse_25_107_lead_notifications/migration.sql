ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "notificationStatus" TEXT NOT NULL DEFAULT 'NOT_SENT',
  ADD COLUMN IF NOT EXISTS "notificationSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notificationMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "notificationError" TEXT;

CREATE INDEX IF NOT EXISTS "PublicLead_notificationStatus_createdAt_idx"
  ON "PublicLead"("notificationStatus", "createdAt");
