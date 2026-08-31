ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "assignedTo" TEXT,
  ADD COLUMN IF NOT EXISTS "nextActionAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastNote" TEXT,
  ADD COLUMN IF NOT EXISTS "lastNoteAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "PublicLead_status_nextActionAt_idx"
  ON "PublicLead"("status", "nextActionAt");

CREATE INDEX IF NOT EXISTS "PublicLead_agencyId_assignedTo_idx"
  ON "PublicLead"("agencyId", "assignedTo");

CREATE TABLE IF NOT EXISTS "PublicLeadNote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "leadId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "author" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PublicLeadNote_leadId_createdAt_idx"
  ON "PublicLeadNote"("leadId", "createdAt");