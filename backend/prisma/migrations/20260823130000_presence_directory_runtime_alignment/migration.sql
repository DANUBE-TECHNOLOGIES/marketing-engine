-- Presence/NAP convergence
-- Reconcile columns already consumed by backend/src/routes/directories.js.
-- Additive/idempotent on purpose: deployments where these legacy columns were
-- introduced manually remain safe, while clean Prisma deployments gain them.

ALTER TABLE "LocalDirectory"
  ADD COLUMN IF NOT EXISTS "url" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "submissionMode" TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE "DirectoryListing"
  ADD COLUMN IF NOT EXISTS "submissionPayload" JSONB,
  ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "automationStatus" TEXT NOT NULL DEFAULT 'todo',
  ADD COLUMN IF NOT EXISTS "score" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "phoneMatch" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "addressMatch" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "websiteMatch" BOOLEAN NOT NULL DEFAULT false;

UPDATE "LocalDirectory"
SET "url" = COALESCE("url", "website"),
    "submissionUrl" = COALESCE("submissionUrl", "website")
WHERE "url" IS NULL OR "submissionUrl" IS NULL;

UPDATE "DirectoryListing"
SET "automationStatus" = CASE
      WHEN status = 'validated' THEN 'validated'
      WHEN status = 'error' THEN 'error'
      ELSE COALESCE("automationStatus", 'todo')
    END,
    "score" = LEAST(100,
      CASE WHEN "nameCorrect" THEN 15 ELSE 0 END +
      CASE WHEN "addressCorrect" THEN 15 ELSE 0 END +
      CASE WHEN "phoneCorrect" THEN 15 ELSE 0 END +
      CASE WHEN "websiteCorrect" THEN 15 ELSE 0 END +
      CASE WHEN "categoryCorrect" THEN 10 ELSE 0 END +
      CASE WHEN "hoursCorrect" THEN 10 ELSE 0 END +
      CASE WHEN "verified" THEN 10 ELSE 0 END +
      CASE WHEN "phoneMatch" THEN 5 ELSE 0 END +
      CASE WHEN "addressMatch" THEN 5 ELSE 0 END
    );