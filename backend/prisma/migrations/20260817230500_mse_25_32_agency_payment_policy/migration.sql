-- MSE-25.32 — Flexible Payment Experience
-- Dedicated one-to-one payment configuration for each AgencySite.

CREATE TABLE "AgencyPaymentPolicy" (
    "siteId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "products" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "installmentCounts" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "feeMode" TEXT NOT NULL DEFAULT 'unspecified',
    "disclaimer" TEXT NOT NULL DEFAULT '',
    "ctaLabel" TEXT NOT NULL DEFAULT 'Contacter mon agence',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyPaymentPolicy_pkey" PRIMARY KEY ("siteId")
);

ALTER TABLE "AgencyPaymentPolicy"
ADD CONSTRAINT "AgencyPaymentPolicy_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "AgencySite"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgencyPaymentPolicy"
ADD CONSTRAINT "AgencyPaymentPolicy_feeMode_check"
CHECK ("feeMode" IN ('unspecified', 'with-fees', 'without-fees'));

CREATE INDEX "AgencyPaymentPolicy_enabled_idx"
ON "AgencyPaymentPolicy"("enabled");
