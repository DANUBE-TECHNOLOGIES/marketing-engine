CREATE TABLE "BackgroundJob" (
  "id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "metadata" JSONB,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "retryDelaySeconds" INTEGER NOT NULL DEFAULT 60,
  "dedupeKey" TEXT,
  "lockedBy" TEXT,
  "lockedUntil" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackgroundJob_status_runAt_priority_idx" ON "BackgroundJob"("status", "runAt", "priority");
CREATE INDEX "BackgroundJob_type_createdAt_idx" ON "BackgroundJob"("type", "createdAt");
CREATE INDEX "BackgroundJob_dedupeKey_status_idx" ON "BackgroundJob"("dedupeKey", "status");
CREATE INDEX "BackgroundJob_lockedUntil_idx" ON "BackgroundJob"("lockedUntil");
