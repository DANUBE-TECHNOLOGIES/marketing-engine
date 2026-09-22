ALTER TABLE "GroupPreRegistration"
  ADD COLUMN "phoneMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneMarketingConsentAt" TIMESTAMP(3),
  ADD COLUMN "phoneMarketingConsentVersion" TEXT;

ALTER TABLE "PublicLead"
  ADD COLUMN "phoneMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "phoneMarketingConsentAt" TIMESTAMP(3),
  ADD COLUMN "phoneMarketingConsentVersion" TEXT;

CREATE INDEX "GroupPreRegistration_campaignSlug_phoneMarketingConsent_idx"
  ON "GroupPreRegistration"("campaignSlug","phoneMarketingConsent");

CREATE INDEX "PublicLead_phoneMarketingConsent_createdAt_idx"
  ON "PublicLead"("phoneMarketingConsent","createdAt");
