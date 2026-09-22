CREATE TABLE "GroupCampaignCapacity" (
  "id" TEXT NOT NULL,
  "campaignSlug" TEXT NOT NULL,
  "departure" TEXT NOT NULL,
  "origin" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL DEFAULT 0,
  "target" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "GroupCampaignCapacity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GroupCampaignCapacity_capacity_check" CHECK ("capacity" >= 0),
  CONSTRAINT "GroupCampaignCapacity_target_check" CHECK ("target" IS NULL OR "target" >= 0)
);

CREATE UNIQUE INDEX "GroupCampaignCapacity_campaignSlug_departure_origin_key"
ON "GroupCampaignCapacity"("campaignSlug", "departure", "origin");

CREATE INDEX "GroupCampaignCapacity_campaignSlug_idx"
ON "GroupCampaignCapacity"("campaignSlug");
