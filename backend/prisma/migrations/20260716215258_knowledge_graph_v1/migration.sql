-- MARKETING KNOWLEDGE GRAPH — SPRINT 003A
-- Migration strictement additive.

CREATE TABLE "KnowledgeEntity" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "metadata" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeEntity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeContentBlock" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeContentBlock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeMediaAsset" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "title" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeMediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeEntity_type_idx"
ON "KnowledgeEntity"("type");

CREATE INDEX "KnowledgeEntity_status_idx"
ON "KnowledgeEntity"("status");

CREATE INDEX "KnowledgeEntity_language_idx"
ON "KnowledgeEntity"("language");

CREATE INDEX "KnowledgeEntity_publishedAt_idx"
ON "KnowledgeEntity"("publishedAt");

CREATE UNIQUE INDEX "KnowledgeEntity_slug_language_key"
ON "KnowledgeEntity"("slug", "language");

CREATE INDEX "KnowledgeRelation_sourceId_idx"
ON "KnowledgeRelation"("sourceId");

CREATE INDEX "KnowledgeRelation_targetId_idx"
ON "KnowledgeRelation"("targetId");

CREATE INDEX "KnowledgeRelation_relationType_idx"
ON "KnowledgeRelation"("relationType");

CREATE UNIQUE INDEX "KnowledgeRelation_sourceId_targetId_relationType_key"
ON "KnowledgeRelation"("sourceId", "targetId", "relationType");

CREATE INDEX "KnowledgeContentBlock_entityId_idx"
ON "KnowledgeContentBlock"("entityId");

CREATE INDEX "KnowledgeContentBlock_type_idx"
ON "KnowledgeContentBlock"("type");

CREATE INDEX "KnowledgeContentBlock_status_idx"
ON "KnowledgeContentBlock"("status");

CREATE INDEX "KnowledgeContentBlock_language_idx"
ON "KnowledgeContentBlock"("language");

CREATE INDEX "KnowledgeContentBlock_entityId_position_idx"
ON "KnowledgeContentBlock"("entityId", "position");

CREATE INDEX "KnowledgeMediaAsset_entityId_idx"
ON "KnowledgeMediaAsset"("entityId");

CREATE INDEX "KnowledgeMediaAsset_type_idx"
ON "KnowledgeMediaAsset"("type");

CREATE INDEX "KnowledgeMediaAsset_entityId_position_idx"
ON "KnowledgeMediaAsset"("entityId", "position");

CREATE INDEX "KnowledgeMediaAsset_entityId_isPrimary_idx"
ON "KnowledgeMediaAsset"("entityId", "isPrimary");

ALTER TABLE "KnowledgeRelation"
ADD CONSTRAINT "KnowledgeRelation_sourceId_fkey"
FOREIGN KEY ("sourceId")
REFERENCES "KnowledgeEntity"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "KnowledgeRelation"
ADD CONSTRAINT "KnowledgeRelation_targetId_fkey"
FOREIGN KEY ("targetId")
REFERENCES "KnowledgeEntity"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "KnowledgeContentBlock"
ADD CONSTRAINT "KnowledgeContentBlock_entityId_fkey"
FOREIGN KEY ("entityId")
REFERENCES "KnowledgeEntity"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "KnowledgeMediaAsset"
ADD CONSTRAINT "KnowledgeMediaAsset_entityId_fkey"
FOREIGN KEY ("entityId")
REFERENCES "KnowledgeEntity"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;
