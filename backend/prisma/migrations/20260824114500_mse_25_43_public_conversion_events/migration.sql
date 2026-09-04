CREATE TABLE "PublicConversionEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "agencyId" INTEGER NOT NULL,
  "siteSlug" TEXT NOT NULL,
  "pageSlug" TEXT NOT NULL,
  "pagePath" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "label" TEXT,
  "target" TEXT,
  "referrerPath" TEXT,
  "occurredAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "PublicConversionEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "AgencySite"("id") ON DELETE CASCADE,
  CONSTRAINT "PublicConversionEvent_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE,
  CONSTRAINT "PublicConversionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT
);
CREATE INDEX "PublicConversionEvent_tenantId_createdAt_idx" ON "PublicConversionEvent"("tenantId", "createdAt" DESC);
CREATE INDEX "PublicConversionEvent_siteId_createdAt_idx" ON "PublicConversionEvent"("siteId", "createdAt" DESC);
CREATE INDEX "PublicConversionEvent_agencyId_createdAt_idx" ON "PublicConversionEvent"("agencyId", "createdAt" DESC);
CREATE INDEX "PublicConversionEvent_siteSlug_pageSlug_idx" ON "PublicConversionEvent"("siteSlug", "pageSlug");
CREATE INDEX "PublicConversionEvent_action_intent_idx" ON "PublicConversionEvent"("action", "intent");
