const prisma = require("../core/prisma/client");

const relatedEntitySelect = {
  id: true,
  type: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  language: true,
};

async function findEntityById(id) {
  return prisma.knowledgeEntity.findUnique({
    where: {
      id,
    },
    select: relatedEntitySelect,
  });
}

async function findAllForEntity(entityId) {
  const [outgoing, incoming] =
    await Promise.all([
      prisma.knowledgeRelation.findMany({
        where: {
          sourceId: entityId,
        },
        include: {
          target: {
            select: relatedEntitySelect,
          },
        },
        orderBy: [
          {
            position: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),

      prisma.knowledgeRelation.findMany({
        where: {
          targetId: entityId,
        },
        include: {
          source: {
            select: relatedEntitySelect,
          },
        },
        orderBy: [
          {
            position: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      }),
    ]);

  return {
    outgoing,
    incoming,
  };
}

async function findById(id) {
  return prisma.knowledgeRelation.findUnique({
    where: {
      id,
    },
    include: {
      source: {
        select: relatedEntitySelect,
      },
      target: {
        select: relatedEntitySelect,
      },
    },
  });
}

async function findDuplicate(
  sourceId,
  targetId,
  relationType
) {
  return prisma.knowledgeRelation.findUnique({
    where: {
      sourceId_targetId_relationType: {
        sourceId,
        targetId,
        relationType,
      },
    },
  });
}

async function create(sourceId, data) {
  return prisma.knowledgeRelation.create({
    data: {
      sourceId,
      ...data,
    },
    include: {
      source: {
        select: relatedEntitySelect,
      },
      target: {
        select: relatedEntitySelect,
      },
    },
  });
}

async function update(id, data) {
  return prisma.knowledgeRelation.update({
    where: {
      id,
    },
    data,
    include: {
      source: {
        select: relatedEntitySelect,
      },
      target: {
        select: relatedEntitySelect,
      },
    },
  });
}

async function remove(id) {
  return prisma.knowledgeRelation.delete({
    where: {
      id,
    },
  });
}

module.exports = {
  findEntityById,
  findAllForEntity,
  findById,
  findDuplicate,
  create,
  update,
  remove,
};
