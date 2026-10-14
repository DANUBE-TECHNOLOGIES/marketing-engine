-- Additive, prior to production deployment. Monthly exclusives share one YYYY-MM campaign.
ALTER TABLE "FramOffer" ADD COLUMN "campaignMonth" VARCHAR(7);
ALTER TABLE "FramOffer" ADD CONSTRAINT "FramOffer_campaign_month_check"
 CHECK (
   ("type" = 'EXCLUS_AMBASSADE' AND "campaignMonth" IS NOT NULL AND "campaignMonth" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
   OR ("type" = 'VENTE_FLASH' AND "campaignMonth" IS NULL)
 );
CREATE INDEX "FramOffer_campaign_month_idx" ON "FramOffer"("campaignMonth", "status");
