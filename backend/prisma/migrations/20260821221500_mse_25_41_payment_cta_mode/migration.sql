-- MSE-25.41 — Flexible Payment productization
-- Persist the CTA destination selected by the payment policy.

ALTER TABLE "AgencyPaymentPolicy"
ADD COLUMN IF NOT EXISTS "ctaMode" TEXT NOT NULL DEFAULT 'contact';

ALTER TABLE "AgencyPaymentPolicy"
DROP CONSTRAINT IF EXISTS "AgencyPaymentPolicy_ctaMode_check";

ALTER TABLE "AgencyPaymentPolicy"
ADD CONSTRAINT "AgencyPaymentPolicy_ctaMode_check"
CHECK ("ctaMode" IN ('contact', 'quote'));
