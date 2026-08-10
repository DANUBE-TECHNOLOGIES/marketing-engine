/*
  Warnings:

  - Added the required column `updatedAt` to the `GooglePost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GooglePost" ADD COLUMN     "ctaLabel" TEXT,
ADD COLUMN     "ctaUrl" TEXT,
ADD COLUMN     "plannedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
