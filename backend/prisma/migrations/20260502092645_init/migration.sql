-- CreateTable
CREATE TABLE "Agency" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "googleReviewUrl" TEXT,
    "googleLocationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleReview" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "reply" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoogleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GooglePost" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GooglePost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingKeyword" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "keyword" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingKeyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingResult" (
    "id" SERIAL NOT NULL,
    "keywordId" INTEGER NOT NULL,
    "position" INTEGER,
    "found" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalDirectory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalDirectory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryListing" (
    "id" SERIAL NOT NULL,
    "agencyId" INTEGER NOT NULL,
    "directoryId" INTEGER NOT NULL,
    "listingUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "nameCorrect" BOOLEAN NOT NULL DEFAULT false,
    "addressCorrect" BOOLEAN NOT NULL DEFAULT false,
    "phoneCorrect" BOOLEAN NOT NULL DEFAULT false,
    "websiteCorrect" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectoryListing_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GoogleReview" ADD CONSTRAINT "GoogleReview_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GooglePost" ADD CONSTRAINT "GooglePost_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingKeyword" ADD CONSTRAINT "RankingKeyword_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingResult" ADD CONSTRAINT "RankingResult_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "RankingKeyword"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryListing" ADD CONSTRAINT "DirectoryListing_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryListing" ADD CONSTRAINT "DirectoryListing_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "LocalDirectory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
