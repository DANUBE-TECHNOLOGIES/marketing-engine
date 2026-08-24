-- Presence operation snapshots and propagation timing.
-- Additive and independent from existing MSE domain tables.

CREATE TABLE IF NOT EXISTS "PresenceOperationSnapshot" (
  "id" BIGSERIAL PRIMARY KEY,
  "operationId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "agencyId" INTEGER,
  "listingId" INTEGER,
  "phase" TEXT NOT NULL,
  "canonicalNap" JSONB,
  "remoteNap" JSONB,
  "diff" JSONB,
  "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "propagationMs" BIGINT
);

CREATE INDEX IF NOT EXISTS "PresenceOperationSnapshot_operationId_idx"
  ON "PresenceOperationSnapshot" ("operationId", "observedAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationSnapshot_providerKey_idx"
  ON "PresenceOperationSnapshot" ("providerKey", "observedAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationSnapshot_agencyId_idx"
  ON "PresenceOperationSnapshot" ("agencyId", "observedAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationSnapshot_phase_idx"
  ON "PresenceOperationSnapshot" ("phase", "observedAt");