const prisma = require("../core/prisma/client");

const entityDetailInclude = {
  contentBlocks: {
    orderBy: [
      { position: "asc" },
      { createdAt: "asc" },
    ],
  },
  mediaAssets: {
    orderBy: [
      { isPrimary: "desc" },
      { position: "asc" },
      { createdAt: "asc" },
    ],
  },
  outgoingRelations: {
    include: {
      target: true,
    },
    orderBy: [
      { position: "asc" },
      { createdAt: "asc" },
    ],
  },
  incomingRelations: {
    include: {
      source: true,
    },
    orderBy: [
      { position: "asc" },
      { createdAt: "asc" },
    ],
  },
};

async function findAll({ where, skip, take }) {
  return prisma.knowledgeEntity.findMany({
    where,
    skip,
    take,
    orderBy: [
      { updatedAt: "desc" },
      { title: "asc" },
    ],
  });
}

async function count(where) {
  return prisma.knowledgeEntity.count({ where });
}

async function findById(id) {
  return prisma.knowledgeEntity.findUnique({
    where: { id },
    include: entityDetailInclude,
  });
}

async function findBySlugAndLanguage(slug, language) {
  return prisma.knowledgeEntity.findUnique({
    where: {
      slug_language: {
        slug,
        language,
      },
    },
  });
}

async function create(data) {
  return prisma.knowledgeEntity.create({
    data,
  });
}

async function update(id, data) {
  return prisma.knowledgeEntity.update({
    where: { id },
    data,
  });
}

async function remove(id) {
  return prisma.knowledgeEntity.delete({
    where: { id },
  });
}

module.exports = {
  findAll,
  count,
  findById,
  findBySlugAndLanguage,
  create,
  update,
  remove,
};
