const prisma = require(
  "../core/prisma/client"
);

const {
  getFieldName,
  writeField,
} = require("./knowledge-media.schema");

function delegate() {
  const result =
    prisma.knowledgeMediaAsset;

  if (!result) {
    throw new Error(
      "Le delegate Prisma knowledgeMediaAsset est indisponible."
    );
  }

  return result;
}

async function findEntityById(id) {
  return prisma.knowledgeEntity.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      type: true,
      slug: true,
      title: true,
      status: true,
      language: true,
    },
  });
}

async function findAllForEntity(entityId) {
  const entityField =
    getFieldName("entityId");

  const positionField =
    getFieldName("position");

  const createdAtField =
    getFieldName("createdAt");

  const orderBy = [];

  if (positionField) {
    orderBy.push({
      [positionField]: "asc",
    });
  }

  if (createdAtField) {
    orderBy.push({
      [createdAtField]: "asc",
    });
  }

  return delegate().findMany({
    where: {
      [entityField]: entityId,
    },
    ...(orderBy.length > 0
      ? {
          orderBy,
        }
      : {}),
  });
}

async function findById(id) {
  return delegate().findUnique({
    where: {
      [getFieldName("id")]: id,
    },
  });
}

async function create(entityId, canonicalData) {
  const data = {};

  writeField(
    data,
    "entityId",
    entityId
  );

  for (
    const [semantic, value]
    of Object.entries(canonicalData)
  ) {
    writeField(data, semantic, value);
  }

  return delegate().create({
    data,
  });
}

async function update(id, canonicalData) {
  const data = {};

  for (
    const [semantic, value]
    of Object.entries(canonicalData)
  ) {
    writeField(data, semantic, value);
  }

  return delegate().update({
    where: {
      [getFieldName("id")]: id,
    },
    data,
  });
}

async function remove(id) {
  return delegate().delete({
    where: {
      [getFieldName("id")]: id,
    },
  });
}

async function unsetPrimary(entityId, excludedId = null) {
  const entityField =
    getFieldName("entityId");

  const primaryField =
    getFieldName("isPrimary");

  if (!primaryField) {
    return {
      count: 0,
    };
  }

  const idField =
    getFieldName("id");

  const where = {
    [entityField]: entityId,
    [primaryField]: true,
  };

  if (excludedId) {
    where[idField] = {
      not: excludedId,
    };
  }

  return delegate().updateMany({
    where,
    data: {
      [primaryField]: false,
    },
  });
}

async function reorder(entityId, items) {
  const entityField =
    getFieldName("entityId");

  const idField =
    getFieldName("id");

  const positionField =
    getFieldName("position");

  if (!positionField) {
    throw new Error(
      "Le modèle KnowledgeMediaAsset ne possède pas de champ de position."
    );
  }

  return prisma.$transaction(
    items.map((item) =>
      delegate().updateMany({
        where: {
          [idField]: item.id,
          [entityField]: entityId,
        },
        data: {
          [positionField]: item.position,
        },
      })
    )
  );
}

module.exports = {
  findEntityById,
  findAllForEntity,
  findById,
  create,
  update,
  remove,
  unsetPrimary,
  reorder,
};
