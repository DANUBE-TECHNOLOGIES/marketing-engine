-- Bundle 004.2B - Knowledge Engine
CREATE TABLE "KnowledgeAlias" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeAlias_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DestinationRelation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL DEFAULT 'similar',
    "score" INTEGER NOT NULL DEFAULT 50,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DestinationRelation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KnowledgeAlias_entityType_entityId_normalizedAlias_locale_key" ON "KnowledgeAlias"("entityType", "entityId", "normalizedAlias", "locale");
CREATE INDEX "KnowledgeAlias_entityType_entityId_idx" ON "KnowledgeAlias"("entityType", "entityId");
CREATE INDEX "KnowledgeAlias_normalizedAlias_idx" ON "KnowledgeAlias"("normalizedAlias");
CREATE INDEX "KnowledgeAlias_locale_idx" ON "KnowledgeAlias"("locale");
CREATE UNIQUE INDEX "DestinationRelation_sourceId_targetId_relationType_key" ON "DestinationRelation"("sourceId", "targetId", "relationType");
CREATE INDEX "DestinationRelation_sourceId_relationType_score_idx" ON "DestinationRelation"("sourceId", "relationType", "score");
CREATE INDEX "DestinationRelation_targetId_relationType_idx" ON "DestinationRelation"("targetId", "relationType");
ALTER TABLE "DestinationRelation" ADD CONSTRAINT "DestinationRelation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DestinationRelation" ADD CONSTRAINT "DestinationRelation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Destination"("id") ON DELETE CASCADE ON UPDATE CASCADE;
