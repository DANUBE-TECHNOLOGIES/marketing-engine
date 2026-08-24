-- Presence/NAP operation audit log.
-- Append-only by application convention; no foreign keys on purpose so audit
-- events survive listing/provider lifecycle changes.

CREATE TABLE IF NOT EXISTS "PresenceOperationAudit" (
  "id" BIGSERIAL PRIMARY KEY,
  "operationId" TEXT NOT NULL,
  "providerKey" TEXT NOT NULL,
  "agencyId" INTEGER,
  "listingId" INTEGER,
  "scope" TEXT NOT NULL DEFAULT 'agency',
  "eventType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "riskLevel" TEXT,
  "payload" JSONB,
  "result" JSONB,
  "error" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PresenceOperationAudit_operationId_idx"
  ON "PresenceOperationAudit" ("operationId", "createdAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationAudit_agencyId_idx"
  ON "PresenceOperationAudit" ("agencyId", "createdAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationAudit_providerKey_idx"
  ON "PresenceOperationAudit" ("providerKey", "createdAt");
CREATE INDEX IF NOT EXISTS "PresenceOperationAudit_status_idx"
  ON "PresenceOperationAudit" ("status", "createdAt");
