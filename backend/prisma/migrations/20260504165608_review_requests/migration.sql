-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "clientEmail" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "message" TEXT NOT NULL,
    "reviewUrl" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
