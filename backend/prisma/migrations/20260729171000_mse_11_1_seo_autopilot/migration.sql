CREATE TABLE "SeoAutopilotRun" (
  "id" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'planned',
  "mode" TEXT NOT NULL DEFAULT 'simulation',
  "policy" JSONB NOT NULL,
  "sourcePlan" JSONB NOT NULL,
  "createdBy" TEXT,
  "totalActions" INTEGER NOT NULL DEFAULT 0,
  "succeededActions" INTEGER NOT NULL DEFAULT 0,
  "failedActions" INTEGER NOT NULL DEFAULT 0,
  "awaitingApprovalActions" INTEGER NOT NULL DEFAULT 0,
  "simulatedActions" INTEGER NOT NULL DEFAULT 0,
  "blockedActions" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoAutopilotRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeoAutopilotAction" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "executionMode" TEXT NOT NULL DEFAULT 'simulation',
  "status" TEXT NOT NULL DEFAULT 'planned',
  "recommendationId" TEXT,
  "targetPageId" TEXT,
  "destinationSlug" TEXT,
  "payload" JSONB NOT NULL,
  "result" JSONB,
  "error" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SeoAutopilotAction_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SeoAutopilotAuditEvent" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "actionId" TEXT,
  "level" TEXT NOT NULL DEFAULT 'info',
  "eventType" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoAutopilotAuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeoAutopilotAction_runId_order_key" ON "SeoAutopilotAction"("runId", "order");
CREATE INDEX "SeoAutopilotRun_siteId_status_idx" ON "SeoAutopilotRun"("siteId", "status");
CREATE INDEX "SeoAutopilotRun_createdAt_idx" ON "SeoAutopilotRun"("createdAt");
CREATE INDEX "SeoAutopilotAction_runId_status_idx" ON "SeoAutopilotAction"("runId", "status");
CREATE INDEX "SeoAutopilotAction_type_status_idx" ON "SeoAutopilotAction"("type", "status");
CREATE INDEX "SeoAutopilotAuditEvent_runId_createdAt_idx" ON "SeoAutopilotAuditEvent"("runId", "createdAt");
CREATE INDEX "SeoAutopilotAuditEvent_actionId_idx" ON "SeoAutopilotAuditEvent"("actionId");
CREATE INDEX "SeoAutopilotAuditEvent_level_eventType_idx" ON "SeoAutopilotAuditEvent"("level", "eventType");
ALTER TABLE "SeoAutopilotAction" ADD CONSTRAINT "SeoAutopilotAction_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SeoAutopilotRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoAutopilotAuditEvent" ADD CONSTRAINT "SeoAutopilotAuditEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SeoAutopilotRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SeoAutopilotAuditEvent" ADD CONSTRAINT "SeoAutopilotAuditEvent_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "SeoAutopilotAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
