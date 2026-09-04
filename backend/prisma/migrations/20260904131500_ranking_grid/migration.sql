-- MSE-25.125 - geographic Google Maps ranking grid
CREATE TABLE "RankingGridCampaign" (
  "id" SERIAL NOT NULL,
  "agencyId" INTEGER NOT NULL,
  "keywordId" INTEGER NOT NULL,
  "keyword" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "centerLat" DOUBLE PRECISION NOT NULL,
  "centerLng" DOUBLE PRECISION NOT NULL,
  "gridSize" INTEGER NOT NULL DEFAULT 5,
  "spacingKm" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "provider" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "summary" JSONB,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankingGridCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RankingGridPoint" (
  "id" SERIAL NOT NULL,
  "campaignId" INTEGER NOT NULL,
  "row" INTEGER NOT NULL,
  "col" INTEGER NOT NULL,
  "latitude" DOUBLE PRECISION NOT NULL,
  "longitude" DOUBLE PRECISION NOT NULL,
  "northKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "eastKm" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "found" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER,
  "absolutePosition" INTEGER,
  "title" TEXT,
  "url" TEXT,
  "rating" DOUBLE PRECISION,
  "reviews" INTEGER,
  "cost" DOUBLE PRECISION,
  "providerMetadata" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "checkedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RankingGridPoint_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RankingGridCampaign_key_key" ON "RankingGridCampaign"("key");
CREATE INDEX "RankingGridCampaign_agencyId_createdAt_idx" ON "RankingGridCampaign"("agencyId", "createdAt");
CREATE INDEX "RankingGridCampaign_keywordId_createdAt_idx" ON "RankingGridCampaign"("keywordId", "createdAt");
CREATE UNIQUE INDEX "RankingGridPoint_campaignId_row_col_key" ON "RankingGridPoint"("campaignId", "row", "col");
CREATE INDEX "RankingGridPoint_campaignId_status_idx" ON "RankingGridPoint"("campaignId", "status");

ALTER TABLE "RankingGridCampaign"
  ADD CONSTRAINT "RankingGridCampaign_agencyId_fkey"
  FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RankingGridCampaign"
  ADD CONSTRAINT "RankingGridCampaign_keywordId_fkey"
  FOREIGN KEY ("keywordId") REFERENCES "RankingKeyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RankingGridPoint"
  ADD CONSTRAINT "RankingGridPoint_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "RankingGridCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
