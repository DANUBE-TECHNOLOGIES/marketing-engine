CREATE TABLE "GroupPreRegistration" (
 "id" TEXT PRIMARY KEY,
 "campaignSlug" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "phone" TEXT,
 "adults" INTEGER NOT NULL DEFAULT 1,
 "children" INTEGER NOT NULL DEFAULT 0,
 "infants" INTEGER NOT NULL DEFAULT 0,
 "travellerCount" INTEGER NOT NULL DEFAULT 1,
 "origins" JSONB NOT NULL DEFAULT '[]'::jsonb,
 "departures" JSONB NOT NULL DEFAULT '[]'::jsonb,
 "preferredDeparture" TEXT,
 "intent" TEXT NOT NULL,
 "source" TEXT,
 "emailMarketingConsent" BOOLEAN NOT NULL DEFAULT false,
 "projectContactConsent" BOOLEAN NOT NULL DEFAULT true,
 "consentVersion" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GroupPreRegistration_campaignSlug_idx" ON "GroupPreRegistration"("campaignSlug");
CREATE INDEX "GroupPreRegistration_email_idx" ON "GroupPreRegistration"("email");
CREATE INDEX "GroupPreRegistration_createdAt_idx" ON "GroupPreRegistration"("createdAt");
