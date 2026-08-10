ALTER TABLE "AgencySitePage" ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE TABLE "PagePublicationVersion" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "actor" TEXT,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagePublicationVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PagePublicationEvent" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "metadata" JSONB,
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PagePublicationEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PagePublicationSchedule" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "actor" TEXT,
    "options" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PagePublicationSchedule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PagePublicationVersion_pageId_version_key" ON "PagePublicationVersion"("pageId", "version");
CREATE INDEX "PagePublicationVersion_pageId_createdAt_idx" ON "PagePublicationVersion"("pageId", "createdAt");
CREATE INDEX "PagePublicationVersion_status_idx" ON "PagePublicationVersion"("status");
CREATE INDEX "PagePublicationEvent_pageId_createdAt_idx" ON "PagePublicationEvent"("pageId", "createdAt");
CREATE INDEX "PagePublicationEvent_type_idx" ON "PagePublicationEvent"("type");
CREATE INDEX "PagePublicationSchedule_status_scheduledAt_idx" ON "PagePublicationSchedule"("status", "scheduledAt");
CREATE INDEX "PagePublicationSchedule_pageId_idx" ON "PagePublicationSchedule"("pageId");
ALTER TABLE "PagePublicationVersion" ADD CONSTRAINT "PagePublicationVersion_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "AgencySitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PagePublicationEvent" ADD CONSTRAINT "PagePublicationEvent_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "AgencySitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PagePublicationSchedule" ADD CONSTRAINT "PagePublicationSchedule_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "AgencySitePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
