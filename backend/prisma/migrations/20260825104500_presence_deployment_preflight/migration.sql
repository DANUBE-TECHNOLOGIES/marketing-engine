CREATE TABLE IF NOT EXISTS "PresenceDeploymentPreflight" (
  "id" BIGSERIAL PRIMARY KEY,
  "preflightId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "readOnlyReady" BOOLEAN NOT NULL DEFAULT FALSE,
  "googleApiReady" BOOLEAN NOT NULL DEFAULT FALSE,
  "googlePilotEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "googleWritesEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
  "report" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "PresenceDeploymentPreflight_createdAt_idx"
  ON "PresenceDeploymentPreflight" ("createdAt" DESC);
