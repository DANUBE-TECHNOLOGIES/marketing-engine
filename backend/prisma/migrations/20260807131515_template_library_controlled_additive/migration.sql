-- ============================================================================
-- MSE-25.1B
-- TEMPLATE LIBRARY
--
-- MIGRATION ADDITIVE CONTRÔLÉE
--
-- INTERDIT :
-- DROP TABLE
-- DROP COLUMN
-- TRUNCATE
-- DELETE
-- ============================================================================


-- ----------------------------------------------------------------------------
-- TemplateDefinition
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "TemplateDefinition" (
    "id" TEXT NOT NULL,
    "identityKey" TEXT NOT NULL,

    "templateKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    "kind" TEXT NOT NULL DEFAULT 'page',
    "pageType" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',
    "version" TEXT NOT NULL,

    "status" TEXT NOT NULL DEFAULT 'draft',
    "scope" TEXT NOT NULL DEFAULT 'tenant',

    "tenantId" TEXT,
    "agencyId" INTEGER,

    "definition" JSONB NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',

    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateDefinition_pkey"
      PRIMARY KEY ("id")
);


-- ----------------------------------------------------------------------------
-- TemplateAssignment
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "TemplateAssignment" (
    "id" TEXT NOT NULL,
    "assignmentKey" TEXT NOT NULL,

    "pageType" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'default',

    "scope" TEXT NOT NULL,

    "tenantId" TEXT,
    "agencyId" INTEGER,

    "templateId" TEXT NOT NULL,

    "active" BOOLEAN NOT NULL DEFAULT true,

    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateAssignment_pkey"
      PRIMARY KEY ("id")
);


-- ----------------------------------------------------------------------------
-- Unicité déterministe
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS
  "TemplateDefinition_identityKey_key"
ON
  "TemplateDefinition"("identityKey");


CREATE UNIQUE INDEX IF NOT EXISTS
  "TemplateAssignment_assignmentKey_key"
ON
  "TemplateAssignment"("assignmentKey");


-- ----------------------------------------------------------------------------
-- Index TemplateDefinition
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
  "TemplateDefinition_templateKey_idx"
ON
  "TemplateDefinition"("templateKey");


CREATE INDEX IF NOT EXISTS
  "TemplateDefinition_pageType_variant_status_idx"
ON
  "TemplateDefinition"("pageType", "variant", "status");


CREATE INDEX IF NOT EXISTS
  "TemplateDefinition_tenantId_pageType_idx"
ON
  "TemplateDefinition"("tenantId", "pageType");


CREATE INDEX IF NOT EXISTS
  "TemplateDefinition_agencyId_pageType_idx"
ON
  "TemplateDefinition"("agencyId", "pageType");


CREATE INDEX IF NOT EXISTS
  "TemplateDefinition_scope_status_idx"
ON
  "TemplateDefinition"("scope", "status");


-- ----------------------------------------------------------------------------
-- Index TemplateAssignment
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS
  "TemplateAssignment_templateId_idx"
ON
  "TemplateAssignment"("templateId");


CREATE INDEX IF NOT EXISTS
  "TemplateAssignment_tenantId_pageType_active_idx"
ON
  "TemplateAssignment"("tenantId", "pageType", "active");


CREATE INDEX IF NOT EXISTS
  "TemplateAssignment_agencyId_pageType_active_idx"
ON
  "TemplateAssignment"("agencyId", "pageType", "active");


-- ----------------------------------------------------------------------------
-- FK TemplateAssignment -> TemplateDefinition
--
-- La contrainte est ajoutée séparément par le runner uniquement si absente.
-- ----------------------------------------------------------------------------
