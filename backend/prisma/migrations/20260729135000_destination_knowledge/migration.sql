CREATE TABLE "DestinationKnowledge" (
  "id" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "timezone" TEXT,
  "utcOffset" TEXT,
  "currencyCode" TEXT,
  "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "flightDurationMin" INTEGER,
  "flightDurationMax" INTEGER,
  "idealDurationMin" INTEGER,
  "idealDurationMax" INTEGER,
  "bestMonths" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "entryRequirements" JSONB,
  "healthAdvice" JSONB,
  "safetyAdvice" JSONB,
  "practicalInfo" JSONB,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "sourceUrl" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DestinationKnowledge_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DestinationKnowledge_destinationId_key" ON "DestinationKnowledge"("destinationId");
CREATE INDEX "DestinationKnowledge_status_idx" ON "DestinationKnowledge"("status");
CREATE INDEX "DestinationKnowledge_currencyCode_idx" ON "DestinationKnowledge"("currencyCode");
ALTER TABLE "DestinationKnowledge" ADD CONSTRAINT "DestinationKnowledge_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DestinationClimateMonth" (
  "id" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "temperatureMinC" DOUBLE PRECISION,
  "temperatureMaxC" DOUBLE PRECISION,
  "seaTemperatureC" DOUBLE PRECISION,
  "rainfallMm" DOUBLE PRECISION,
  "rainyDays" INTEGER,
  "sunshineHours" DOUBLE PRECISION,
  "humidityPercent" INTEGER,
  "comfortScore" INTEGER,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DestinationClimateMonth_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DestinationClimateMonth_destinationId_month_key" ON "DestinationClimateMonth"("destinationId", "month");
CREATE INDEX "DestinationClimateMonth_destinationId_idx" ON "DestinationClimateMonth"("destinationId");
CREATE INDEX "DestinationClimateMonth_month_idx" ON "DestinationClimateMonth"("month");
ALTER TABLE "DestinationClimateMonth" ADD CONSTRAINT "DestinationClimateMonth_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DestinationTravelProfile" (
  "id" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "familyScore" INTEGER,
  "coupleScore" INTEGER,
  "luxuryScore" INTEGER,
  "adventureScore" INTEGER,
  "cultureScore" INTEGER,
  "beachScore" INTEGER,
  "natureScore" INTEGER,
  "nightlifeScore" INTEGER,
  "accessibilityScore" INTEGER,
  "suitableFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "notRecommendedFor" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DestinationTravelProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DestinationTravelProfile_destinationId_key" ON "DestinationTravelProfile"("destinationId");
ALTER TABLE "DestinationTravelProfile" ADD CONSTRAINT "DestinationTravelProfile_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DestinationBudgetProfile" (
  "id" TEXT NOT NULL,
  "destinationId" TEXT NOT NULL,
  "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
  "dailyBudgetLow" INTEGER,
  "dailyBudgetMid" INTEGER,
  "dailyBudgetHigh" INTEGER,
  "flightBudgetLow" INTEGER,
  "flightBudgetMid" INTEGER,
  "flightBudgetHigh" INTEGER,
  "accommodationLow" INTEGER,
  "accommodationMid" INTEGER,
  "accommodationHigh" INTEGER,
  "seasonality" JSONB,
  "notes" TEXT,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DestinationBudgetProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DestinationBudgetProfile_destinationId_key" ON "DestinationBudgetProfile"("destinationId");
ALTER TABLE "DestinationBudgetProfile" ADD CONSTRAINT "DestinationBudgetProfile_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
