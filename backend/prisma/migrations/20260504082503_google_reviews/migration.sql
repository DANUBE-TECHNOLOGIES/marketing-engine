/*
  Warnings:

  - A unique constraint covering the columns `[name,city]` on the table `Agency` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `LocalDirectory` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `GoogleReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GoogleReview" ADD COLUMN     "googleReviewId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agency_name_city_key" ON "Agency"("name", "city");

-- CreateIndex
CREATE UNIQUE INDEX "LocalDirectory_name_key" ON "LocalDirectory"("name");
