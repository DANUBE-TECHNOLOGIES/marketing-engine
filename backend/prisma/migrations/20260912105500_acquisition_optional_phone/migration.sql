-- MSE-25.206 — Acquisition funnel allows email-only leads.
-- PublicLead predates acquisition funnels and originally required a phone number.
-- Keep the legacy intake validation unchanged, but allow the shared persistence
-- table to store acquisition leads that explicitly choose not to provide phone.
ALTER TABLE "PublicLead"
  ALTER COLUMN "phone" DROP NOT NULL;
