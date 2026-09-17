-- MSE-25.244 — Quote/contact explicit phone callback consent proof
-- Additive and backward-compatible: existing leads remain untouched.
ALTER TABLE "PublicLead"
  ADD COLUMN IF NOT EXISTS "phoneProjectContact" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "phoneConsentAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "phoneConsentText" TEXT,
  ADD COLUMN IF NOT EXISTS "phoneConsentVersion" TEXT;

COMMENT ON COLUMN "PublicLead"."phoneProjectContact" IS 'Explicit consent to be contacted by phone about this travel project.';
COMMENT ON COLUMN "PublicLead"."phoneConsentAt" IS 'Server-side timestamp when explicit phone callback consent was recorded.';
COMMENT ON COLUMN "PublicLead"."phoneConsentText" IS 'Exact consent wording presented and accepted by the prospect.';
COMMENT ON COLUMN "PublicLead"."phoneConsentVersion" IS 'Version identifier for the accepted phone consent wording.';
