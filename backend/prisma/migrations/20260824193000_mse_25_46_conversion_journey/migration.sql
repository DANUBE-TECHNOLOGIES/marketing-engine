CREATE TABLE IF NOT EXISTS "PublicConversionJourneyEvent" (
  "id" BIGSERIAL PRIMARY KEY,
  "tenantId" TEXT NOT NULL,
  "siteId" TEXT NOT NULL,
  "agencyId" INTEGER,
  "siteSlug" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "pageSlug" TEXT NOT NULL,
  "pagePath" TEXT NOT NULL,
  "intent" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "placement" TEXT NOT NULL,
  "referrerPath" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PublicConversionJourneyEvent_tenant_occurred_idx"
  ON "PublicConversionJourneyEvent" ("tenantId", "occurredAt");
CREATE INDEX IF NOT EXISTS "PublicConversionJourneyEvent_site_occurred_idx"
  ON "PublicConversionJourneyEvent" ("siteSlug", "occurredAt");
CREATE INDEX IF NOT EXISTS "PublicConversionJourneyEvent_journey_occurred_idx"
  ON "PublicConversionJourneyEvent" ("journeyId", "occurredAt");
