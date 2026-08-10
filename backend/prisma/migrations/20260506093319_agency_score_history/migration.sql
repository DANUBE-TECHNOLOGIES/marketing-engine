-- CreateTable
CREATE TABLE "AgencyScoreHistory" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "citationScore" INTEGER NOT NULL,
    "globalScore" INTEGER NOT NULL,
    "reviewsCount" INTEGER NOT NULL,
    "rankingsCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyScoreHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgencyScoreHistory" ADD CONSTRAINT "AgencyScoreHistory_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
