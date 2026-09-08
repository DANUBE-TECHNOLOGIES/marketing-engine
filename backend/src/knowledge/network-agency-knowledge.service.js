const prisma = require("../core/prisma/client");
const knowledgeRelationService = require("./knowledge-relation.service");

const TARGET_TYPES = new Set([
  "destination", "country", "region", "city", "island",
  "travel_theme", "cruise", "circuit", "travel_product", "activity",
]);
const READ_RELATION_TYPES = new Set(["recommends", "features", "available_in"]);
const CREATE_RELATION_TYPES = new Set(["recommends", "features"]);

function clean(value) { return String(value || "").trim(); }
function sortEntities(items = []) {
  return [...items].sort((a, b) => `${a.type}:${a.title}`.localeCompare(`${b.type}:${b.title}`, "fr"));
}
function targetSummary(target) {
  return { id: target.id, type: target.type, slug: target.slug, title: target.title, language: target.language };
}

async function matrix({ prismaClient = prisma } = {}) {
  const [agencies, targets] = await Promise.all([
    prismaClient.knowledgeEntity.findMany({
      where: { type: "agency", status: "published" },
      select: {
        id: true, slug: true, title: true, language: true,
        outgoingRelations: {
          where: { relationType: { in: [...READ_RELATION_TYPES] } },
          select: {
            id: true, relationType: true, targetId: true,
            target: { select: { id: true, type: true, slug: true, title: true, status: true, language: true } },
          },
        },
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
    prismaClient.knowledgeEntity.findMany({
      where: { type: { in: [...TARGET_TYPES] }, status: "published" },
      select: { id: true, type: true, slug: true, title: true, language: true },
      orderBy: [{ type: "asc" }, { title: "asc" }, { id: "asc" }],
    }),
  ]);

  const rows = (agencies || []).map((agency) => ({
    agency: { id: agency.id, slug: agency.slug, title: agency.title, language: agency.language },
    relations: (agency.outgoingRelations || [])
      .filter((relation) =>
        READ_RELATION_TYPES.has(clean(relation.relationType)) &&
        relation.target?.status === "published" &&
        TARGET_TYPES.has(clean(relation.target?.type))
      )
      .map((relation) => ({
        relationId: relation.id,
        relationType: relation.relationType,
        target: targetSummary(relation.target),
      })),
  }));

  return {
    mode: "read-only", writes: false, destructive: false, inference: false, providerCall: false,
    creatableRelationTypes: [...CREATE_RELATION_TYPES],
    summary: {
      agencyCount: rows.length,
      targetCount: (targets || []).length,
      explicitRelationCount: rows.reduce((sum, row) => sum + row.relations.length, 0),
    },
    targets: sortEntities(targets || []),
    agencies: rows,
  };
}

async function addExplicitRelation({
  agencyKnowledgeId,
  targetKnowledgeId,
  relationType,
  prismaClient = prisma,
  createRelation = (sourceId, payload) => knowledgeRelationService.create(sourceId, payload),
} = {}) {
  const agencyId = clean(agencyKnowledgeId);
  const targetId = clean(targetKnowledgeId);
  const type = clean(relationType);

  if (!agencyId || !targetId || !type) {
    const error = new Error("agencyKnowledgeId, targetKnowledgeId et relationType sont obligatoires.");
    error.status = 400; error.code = "NETWORK_AGENCY_KNOWLEDGE_IDS_REQUIRED"; throw error;
  }
  if (!CREATE_RELATION_TYPES.has(type)) {
    const error = new Error(`Relation Agency Knowledge non créable: ${type}`);
    error.status = 409; error.code = "NETWORK_AGENCY_KNOWLEDGE_RELATION_FORBIDDEN"; throw error;
  }

  const [agency, target] = await Promise.all([
    prismaClient.knowledgeEntity.findUnique({
      where: { id: agencyId },
      include: { outgoingRelations: { where: { relationType: { in: [...READ_RELATION_TYPES] } } } },
    }),
    prismaClient.knowledgeEntity.findUnique({ where: { id: targetId } }),
  ]);

  if (!agency || agency.type !== "agency" || agency.status !== "published") {
    const error = new Error("Agency Knowledge publiée introuvable.");
    error.status = 409; error.code = "NETWORK_AGENCY_KNOWLEDGE_AGENCY_INVALID"; throw error;
  }
  if (!target || target.status !== "published" || !TARGET_TYPES.has(clean(target.type))) {
    const error = new Error("Cible Knowledge publiée non autorisée.");
    error.status = 409; error.code = "NETWORK_AGENCY_KNOWLEDGE_TARGET_INVALID"; throw error;
  }

  const existing = (agency.outgoingRelations || []).find((relation) =>
    clean(relation.relationType) === type && clean(relation.targetId) === targetId
  );
  if (existing) {
    return { created: false, noop: true, relationId: existing.id, agencyKnowledgeId: agencyId, targetKnowledgeId: targetId, relationType: type, inference: false };
  }

  const relation = await createRelation(agencyId, { targetId, relationType: type });
  return { created: true, noop: false, relationId: relation?.id || null, agencyKnowledgeId: agencyId, targetKnowledgeId: targetId, relationType: type, inference: false };
}

module.exports = { CREATE_RELATION_TYPES, READ_RELATION_TYPES, TARGET_TYPES, addExplicitRelation, matrix };
