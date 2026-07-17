const prisma = require("../core/prisma/client");

async function findEntityById(entityId) {
  return prisma.knowledgeEntity.findUnique({
    where: {
      id: entityId,
    },
    select: {
      id: true,
      title: true,
    },
  });
}

async function findAllByEntityId(entityId) {
  return prisma.knowledgeContentBlock.findMany({
    where: {
      entityId,
    },
    orderBy: [
      {
        position: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
  });
}

async function findById(blockId) {
  return prisma.knowledgeContentBlock.findUnique({
    where: {
      id: blockId,
    },
  });
}

async function findLastPosition(entityId) {
  const lastBlock =
    await prisma.knowledgeContentBlock.findFirst({
      where: {
        entityId,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });

  return lastBlock?.position ?? -1;
}

async function create(entityId, data) {
  return prisma.knowledgeContentBlock.create({
    data: {
      entityId,
      ...data,
    },
  });
}

async function update(blockId, data) {
  return prisma.knowledgeContentBlock.update({
    where: {
      id: blockId,
    },
    data,
  });
}

async function remove(blockId) {
  return prisma.knowledgeContentBlock.delete({
    where: {
      id: blockId,
    },
  });
}

async function reorder(entityId, blocks) {
  return prisma.$transaction(
    blocks.map((block) =>
      prisma.knowledgeContentBlock.updateMany({
        where: {
          id: block.id,
          entityId,
        },
        data: {
          position: block.position,
        },
      })
    )
  );
}

module.exports = {
  findEntityById,
  findAllByEntityId,
  findById,
  findLastPosition,
  create,
  update,
  remove,
  reorder,
};
