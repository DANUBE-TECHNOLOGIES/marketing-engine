const repository = require(
  "./knowledge-relation.repository"
);

const {
  ValidationError,
  NotFoundError,
  ConflictError,
} = require("../core/errors");

const {
  validateCreatePayload,
  validateUpdatePayload,
} = require("./knowledge-relation.validation");

const {
  toDetailDto,
  toListDto,
} = require("./knowledge-relation.mapper");

async function ensureEntityExists(
  id,
  role = "source"
) {
  if (!id) {
    throw new ValidationError(
      `L’identifiant de l’entité ${role} est obligatoire.`
    );
  }

  const entity =
    await repository.findEntityById(id);

  if (!entity) {
    throw new NotFoundError(
      `Entité Knowledge ${role} introuvable.`,
      {
        id,
        role,
      }
    );
  }

  return entity;
}

async function ensureRelationBelongsToSource(
  sourceId,
  relationId
) {
  const relation =
    await repository.findById(relationId);

  if (
    !relation ||
    relation.sourceId !== sourceId
  ) {
    throw new NotFoundError(
      "Relation Knowledge introuvable.",
      {
        sourceId,
        relationId,
      }
    );
  }

  return relation;
}

async function ensureNoDuplicate(
  sourceId,
  targetId,
  relationType,
  excludedRelationId = null
) {
  const duplicate =
    await repository.findDuplicate(
      sourceId,
      targetId,
      relationType
    );

  if (
    duplicate &&
    duplicate.id !== excludedRelationId
  ) {
    throw new ConflictError(
      "Cette relation existe déjà.",
      {
        sourceId,
        targetId,
        relationType,
        relationId: duplicate.id,
      }
    );
  }
}

async function list(entityId) {
  await ensureEntityExists(
    entityId,
    "principale"
  );

  const result =
    await repository.findAllForEntity(entityId);

  return toListDto(result);
}

async function create(sourceId, payload) {
  await ensureEntityExists(sourceId, "source");

  const data = validateCreatePayload(payload);

  if (sourceId === data.targetId) {
    throw new ValidationError(
      "Une connaissance ne peut pas être reliée à elle-même."
    );
  }

  await ensureEntityExists(
    data.targetId,
    "cible"
  );

  await ensureNoDuplicate(
    sourceId,
    data.targetId,
    data.relationType
  );

  try {
    const relation = await repository.create(
      sourceId,
      data
    );

    return toDetailDto(relation);
  } catch (error) {
    if (error?.code === "P2002") {
      throw new ConflictError(
        "Cette relation existe déjà."
      );
    }

    throw error;
  }
}

async function update(
  sourceId,
  relationId,
  payload
) {
  await ensureEntityExists(sourceId, "source");

  const current =
    await ensureRelationBelongsToSource(
      sourceId,
      relationId
    );

  const data = validateUpdatePayload(payload);

  const targetId =
    data.targetId || current.targetId;

  const relationType =
    data.relationType ||
    current.relationType;

  if (sourceId === targetId) {
    throw new ValidationError(
      "Une connaissance ne peut pas être reliée à elle-même."
    );
  }

  if (data.targetId !== undefined) {
    await ensureEntityExists(
      data.targetId,
      "cible"
    );
  }

  if (
    targetId !== current.targetId ||
    relationType !== current.relationType
  ) {
    await ensureNoDuplicate(
      sourceId,
      targetId,
      relationType,
      relationId
    );
  }

  try {
    const relation = await repository.update(
      relationId,
      data
    );

    return toDetailDto(relation);
  } catch (error) {
    if (error?.code === "P2002") {
      throw new ConflictError(
        "Cette relation existe déjà."
      );
    }

    throw error;
  }
}

async function remove(
  sourceId,
  relationId
) {
  await ensureEntityExists(sourceId, "source");

  await ensureRelationBelongsToSource(
    sourceId,
    relationId
  );

  await repository.remove(relationId);

  return {
    id: relationId,
    deleted: true,
  };
}

module.exports = {
  list,
  create,
  update,
  remove,
};
