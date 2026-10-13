-- Additive migration. All agencies remain disabled until explicitly approved.
CREATE TABLE "FramAmbassadorAgency" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "agencyId" INTEGER NOT NULL UNIQUE,
 "enabled" BOOLEAN NOT NULL DEFAULT false,
 "approvedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FramAmbassadorAgency_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "FramOffer" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "type" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'DRAFT',
 "title" VARCHAR(160) NOT NULL,
 "description" TEXT,
 "imageUrl" TEXT,
 "terms" TEXT,
 "startAt" TIMESTAMP(3) NOT NULL,
 "endAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FramOffer_date_check" CHECK ("endAt" > "startAt"),
 CONSTRAINT "FramOffer_type_check" CHECK ("type" IN ('EXCLUS_AMBASSADE','VENTE_FLASH')),
 CONSTRAINT "FramOffer_status_check" CHECK ("status" IN ('DRAFT','PUBLISHED','ARCHIVED'))
);
CREATE INDEX "FramOffer_public_idx" ON "FramOffer"("status","type","startAt","endAt");
