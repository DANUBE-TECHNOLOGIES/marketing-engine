/*
  Warnings:

  - A unique constraint covering the columns `[agencyId,directoryId]` on the table `DirectoryListing` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `DirectoryListing` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DirectoryListing" ADD COLUMN     "categoryCorrect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hoursCorrect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "LocalDirectory" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general',
ADD COLUMN     "difficulty" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "impactScore" INTEGER NOT NULL DEFAULT 3,
ALTER COLUMN "priority" SET DEFAULT 2;

-- CreateIndex
CREATE UNIQUE INDEX "DirectoryListing_agencyId_directoryId_key" ON "DirectoryListing"("agencyId", "directoryId");
