const crypto = require("node:crypto");
const prisma = require("../core/prisma/client");
const knowledgeRelationService = require("./knowledge-relation.service");
const {
  CREATE_RELATION_TYPES,
  TARGET_TYPES,
} = require("./network-agency-knowledge.service");

function clean(value) {
  return String(value || "").trim();
}

function normalizedAgencyIds(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(clean).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function validateBulkInput({ agencyKnowledgeIds, targetKnowledgeId, relationType } = {}) {
  const agencyIds = normalizedAgencyIds(agencyKnowledgeIds);
  const targetId = clean(targetKnowledgeId);
  const type = clean(relationType);

  if (!agencyIds.length) {
    const error = new Error("La sélection d'Agency Knowledge doit être explicite et non vide.");
    error.status = 400;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_AGENCIES_REQUIRED";
    throw error;
  }
  if (!targetId) {
    const error = new Error("targetKnowledgeId est obligatoire.");
    error.status = 400;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_TARGET_REQUIRED";
    throw error;
  }
  if (!CREATE_RELATION_TYPES.has(type)) {
    const error = new Error(`Relation bulk Agency Knowledge non créable: ${type}`);
    error.status = 409;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_RELATION_FORBIDDEN";
    throw error;
  }

  return { agencyIds, targetId, relationType: type };
}

function targetFact(target) {
  return {
    id: target.id,
    type: target.type,
    slug: target.slug,
    title: target.title,
    status: target.status,
    language: target.language,
  };
}

function agencyFact(agency, targetId, relationType) {
  const existing = (agency.outgoingRelations || []).find(
    (relation) =>
      clean(relation.relationType) === relationType &&
      clean(relation.targetId) === targetId
  );

  return {
    id: agency.id,
    slug: agency.slug,
    title: agency.title,
    status: agency.status,
    language: agency.language,
    action: existing ? "noop" : "create",
    existingRelationId: existing?.id || null,
  };
}

function approvalPayload(report) {
  return {
    mode: "network-agency-knowledge-bulk",
    relationType: report.relationType,
    target: report.target,
    agencies: [...(report.agencies || [])]
      .map((agency) => ({
        id: agency.id,
        slug: agency.slug,
        title: agency.title,
        status: agency.status,
        language: agency.language,
        action: agency.action,
        existingRelationId: agency.existingRelationId,
      }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

function approvalTokenForReport(report) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(approvalPayload(report)), "utf8")
    .digest("hex");
}

function validateApproval(report, token) {
  const supplied = clean(token).toLowerCase();
  if (!supplied) {
    const error = new Error("Une approbation explicite du bulk Agency Knowledge est obligatoire.");
    error.status = 400;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_APPROVAL_REQUIRED";
    throw error;
  }

  const expected = approvalTokenForReport(report);
  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    const error = new Error("L'approbation bulk Agency Knowledge ne correspond plus à l'état courant.");
    error.status = 409;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_APPROVAL_STALE";
    throw error;
  }

  return true;
}

async function buildReport({
  agencyKnowledgeIds,
  targetKnowledgeId,
  relationType,
  prismaClient = prisma,
} = {}) {
  const { agencyIds, targetId, relationType: type } = validateBulkInput({
    agencyKnowledgeIds,
    targetKnowledgeId,
    relationType,
  });

  const [target, agencies] = await Promise.all([
    prismaClient.knowledgeEntity.findUnique({ where: { id: targetId } }),
    prismaClient.knowledgeEntity.findMany({
      where: { id: { in: agencyIds } },
      include: {
        outgoingRelations: {
          where: { relationType: type },
          select: { id: true, relationType: true, targetId: true },
        },
      },
      orderBy: [{ id: "asc" }],
    }),
  ]);

  if (!target || target.status !== "published" || !TARGET_TYPES.has(clean(target.type))) {
    const error = new Error("Cible Knowledge publiée non autorisée pour le bulk.");
    error.status = 409;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_TARGET_INVALID";
    throw error;
  }

  const byId = new Map((agencies || []).map((agency) => [String(agency.id), agency]));
  const missingIds = agencyIds.filter((id) => !byId.has(id));
  if (missingIds.length) {
    const error = new Error(`Agency Knowledge introuvable: ${missingIds.join(", ")}`);
    error.status = 409;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_AGENCY_MISSING";
    throw error;
  }

  const invalidAgency = agencyIds
    .map((id) => byId.get(id))
    .find((agency) => agency.type !== "agency" || agency.status !== "published");
  if (invalidAgency) {
    const error = new Error(`Agency Knowledge non publiée ou de mauvais type: ${invalidAgency.id}`);
    error.status = 409;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_AGENCY_INVALID";
    throw error;
  }

  const rows = agencyIds.map((id) => agencyFact(byId.get(id), targetId, type));
  const report = {
    mode: "preview",
    writes: false,
    destructive: false,
    inference: false,
    providerCall: false,
    relationType: type,
    target: targetFact(target),
    summary: {
      agencyCount: rows.length,
      createCount: rows.filter((row) => row.action === "create").length,
      noopCount: rows.filter((row) => row.action === "noop").length,
    },
    agencies: rows,
  };

  return report;
}

async function preview(input = {}) {
  const report = await buildReport(input);
  return {
    report,
    approvalToken: approvalTokenForReport(report),
  };
}

async function apply({
  agencyKnowledgeIds,
  targetKnowledgeId,
  relationType,
  approvalToken,
  prismaClient = prisma,
  createRelation = (sourceId, payload) => knowledgeRelationService.create(sourceId, payload),
} = {}) {
  if (!approvalToken) {
    const error = new Error("Une approbation explicite du bulk Agency Knowledge est obligatoire.");
    error.status = 400;
    error.code = "NETWORK_AGENCY_KNOWLEDGE_BULK_APPROVAL_REQUIRED";
    throw error;
  }

  const report = await buildReport({
    agencyKnowledgeIds,
    targetKnowledgeId,
    relationType,
    prismaClient,
  });
  validateApproval(report, approvalToken);

  // Full preflight is complete at this point. No mutation happened before the
  // target and every selected Agency were reloaded and validated together.
  const results = [];
  for (const agency of report.agencies) {
    if (agency.action === "noop") {
      results.push({
        agencyKnowledgeId: agency.id,
        action: "noop",
        relationId: agency.existingRelationId,
      });
      continue;
    }

    const relation = await createRelation(agency.id, {
      targetId: report.target.id,
      relationType: report.relationType,
    });
    results.push({
      agencyKnowledgeId: agency.id,
      action: "created",
      relationId: relation?.id || null,
    });
  }

  return {
    mode: "apply",
    destructive: false,
    inference: false,
    providerCall: false,
    relationType: report.relationType,
    target: report.target,
    summary: {
      agencyCount: report.summary.agencyCount,
      createdCount: results.filter((item) => item.action === "created").length,
      noopCount: results.filter((item) => item.action === "noop").length,
    },
    results,
  };
}

module.exports = {
  agencyFact,
  apply,
  approvalPayload,
  approvalTokenForReport,
  buildReport,
  normalizedAgencyIds,
  preview,
  validateApproval,
  validateBulkInput,
};
