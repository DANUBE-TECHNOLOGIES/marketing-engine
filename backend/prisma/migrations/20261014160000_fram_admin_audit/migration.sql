CREATE TABLE "FramAdminAudit" (
  "id" TEXT NOT NULL,
  "action" VARCHAR(64) NOT NULL,
  "target" VARCHAR(160) NOT NULL,
  "tenantId" VARCHAR(160) NOT NULL,
  "actorType" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FramAdminAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FramAdminAudit_tenant_time_idx" ON "FramAdminAudit"("tenantId", "createdAt");
