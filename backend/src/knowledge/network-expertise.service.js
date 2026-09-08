const prisma = require("../core/prisma/client");
const knowledgeRelationService = require("./knowledge-relation.service");

function clean(value) {
  return String(value || "").trim();
}

function sortByTitle(items = []) {
  return [...items].sort((a, b) =>
    String(a?.title || "").localeCompare(String(b?.title || ""), "fr")
  );
}

async function matrix({ prismaClient = prisma } = {}) {
  const [people, expertise] = await Promise.all([
    prismaClient.knowledgeEntity.findMany({
      where: { type: "person", status: "published" },
      select: {
        id: true,
        slug: true,
        title: true,
        language: true,
        outgoingRelations: {
          where: { relationType: { in: ["works_at", "expert_in"] } },
          select: {
            id: true,
            relationType: true,
            targetId: true,
            target: {
              select: {
                id: true,
                type: true,
                slug: true,
                title: true,
                status: true,
                language: true,
              },
            },
          },
        },
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
    prismaClient.knowledgeEntity.findMany({
      where: { type: "expertise", status: "published" },
      select: {
        id: true,
        slug: true,
        title: true,
        language: true,
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
    }),
  ]);

  const rows = (people || []).map((person) => {
    const worksAt = (person.outgoingRelations || []).find(
      (relation) =>
        relation.relationType === "works_at" &&
        relation.target?.type === "agency" &&
        relation.target?.status === "published"
    );

    const expertIn = (person.outgoingRelations || [])
      .filter(
        (relation) =>
          relation.relationType === "expert_in" &&
          relation.target?.type === "expertise" &&
          relation.target?.status === "published"
      )
      .map((relation) => ({
        relationId: relation.id,
        id: relation.target.id,
        slug: relation.target.slug,
        title: relation.target.title,
        language: relation.target.language,
      }));

    return {
      person: {
        id: person.id,
        slug: person.slug,
        title: person.title,
        language: person.language,
      },
      agency: worksAt
        ? {
            id: worksAt.target.id,
            slug: worksAt.target.slug,
            title: worksAt.target.title,
          }
        : null,
      expertises: sortByTitle(expertIn),
      eligible: Boolean(worksAt),
      blockedReason: worksAt ? null : "published_agency_works_at_missing",
    };
  });

  return {
    mode: "read-only",
    writes: false,
    destructive: false,
    inference: false,
    providerCall: false,
    summary: {
      personCount: rows.length,
      eligiblePersonCount: rows.filter((row) => row.eligible).length,
      blockedPersonCount: rows.filter((row) => !row.eligible).length,
      expertiseCount: (expertise || []).length,
      explicitExpertInCount: rows.reduce((sum, row) => sum + row.expertises.length, 0),
    },
    expertise: sortByTitle(expertise || []),
    people: rows,
  };
}

async function addExplicitExpertise({
  personId,
  expertiseId,
  prismaClient = prisma,
  createRelation = (sourceId, payload) => knowledgeRelationService.create(sourceId, payload),
} = {}) {
  const normalizedPersonId = clean(personId);
  const normalizedExpertiseId = clean(expertiseId);

  if (!normalizedPersonId || !normalizedExpertiseId) {
    const error = new Error("personId et expertiseId sont obligatoires.");
    error.status = 400;
    error.code = "NETWORK_EXPERTISE_IDS_REQUIRED";
    throw error;
  }

  const [person, expertise] = await Promise.all([
    prismaClient.knowledgeEntity.findUnique({
      where: { id: normalizedPersonId },
      include: {
        outgoingRelations: {
          where: { relationType: { in: ["works_at", "expert_in"] } },
          include: { target: true },
        },
      },
    }),
    prismaClient.knowledgeEntity.findUnique({
      where: { id: normalizedExpertiseId },
    }),
  ]);

  if (!person || person.type !== "person" || person.status !== "published") {
    const error = new Error("Person Knowledge publiée introuvable.");
    error.status = 409;
    error.code = "NETWORK_EXPERTISE_PERSON_INVALID";
    throw error;
  }

  if (!expertise || expertise.type !== "expertise" || expertise.status !== "published") {
    const error = new Error("Expertise Knowledge publiée introuvable.");
    error.status = 409;
    error.code = "NETWORK_EXPERTISE_TARGET_INVALID";
    throw error;
  }

  const worksAt = (person.outgoingRelations || []).some(
    (relation) =>
      relation.relationType === "works_at" &&
      relation.target?.type === "agency" &&
      relation.target?.status === "published"
  );

  if (!worksAt) {
    const error = new Error("La Person doit être rattachée à une Agency publiée via works_at.");
    error.status = 409;
    error.code = "NETWORK_EXPERTISE_WORKS_AT_REQUIRED";
    throw error;
  }

  const existing = (person.outgoingRelations || []).find(
    (relation) =>
      relation.relationType === "expert_in" &&
      clean(relation.targetId || relation.target?.id) === normalizedExpertiseId
  );

  if (existing) {
    return {
      created: false,
      noop: true,
      relationId: existing.id,
      personId: normalizedPersonId,
      expertiseId: normalizedExpertiseId,
      inference: false,
    };
  }

  const relation = await createRelation(normalizedPersonId, {
    targetId: normalizedExpertiseId,
    relationType: "expert_in",
  });

  return {
    created: true,
    noop: false,
    relationId: relation?.id || null,
    personId: normalizedPersonId,
    expertiseId: normalizedExpertiseId,
    inference: false,
  };
}

module.exports = {
  addExplicitExpertise,
  matrix,
};
