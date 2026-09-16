ALTER TABLE "AcquisitionFunnelEvent"
  ADD COLUMN IF NOT EXISTS "experimentId" TEXT,
  ADD COLUMN IF NOT EXISTS "variant" TEXT;

CREATE INDEX IF NOT EXISTS "AcquisitionFunnelEvent_experiment_variant_createdAt_idx"
  ON "AcquisitionFunnelEvent" ("experimentId", "variant", "createdAt");
