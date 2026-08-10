CREATE TABLE "PageBlock" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "blockType" TEXT NOT NULL,
  "name" TEXT,
  "content" JSONB NOT NULL,
  "settings" JSONB NOT NULL DEFAULT '{}',
  "seo" JSONB NOT NULL DEFAULT '{}',
  "displayOrder" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "visibleDesktop" BOOLEAN NOT NULL DEFAULT true,
  "visibleMobile" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PageBlock_pageId_displayOrder_idx" ON "PageBlock"("pageId", "displayOrder");
CREATE INDEX "PageBlock_pageId_status_idx" ON "PageBlock"("pageId", "status");
CREATE INDEX "PageBlock_blockType_idx" ON "PageBlock"("blockType");

ALTER TABLE "PageBlock"
ADD CONSTRAINT "PageBlock_pageId_fkey"
FOREIGN KEY ("pageId") REFERENCES "AgencySitePage"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
