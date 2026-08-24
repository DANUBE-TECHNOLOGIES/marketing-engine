CREATE TABLE IF NOT EXISTS "PresenceCitationObservation" (
  "id" BIGSERIAL PRIMARY KEY,
  "agencyId" INTEGER NOT NULL,
  "providerKey" TEXT NOT NULL,
  "listingId" INTEGER,
  "listingUrl" TEXT,
  "observed" JSONB NOT NULL,
  "diff" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PresenceCitationObservation_agency_provider_created_idx"
  ON "PresenceCitationObservation" ("agencyId", "providerKey", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "PresenceCitationObservation_listing_created_idx"
  ON "PresenceCitationObservation" ("listingId", "createdAt" DESC);
