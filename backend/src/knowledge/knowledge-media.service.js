const repository = require(
  "./knowledge-media.repository"
);

const {
  getFieldName,
} = require("./knowledge-media.schema");

const {
  ValidationError,
  NotFoundError,
} = require("../core/errors");

const {
  validateCreatePayload,
  validateUpdatePayload,
  validateReorderPayload,
} = require("./knowledge-media.validation");

const {
  toDto,
  toListDto,
} = require("./knowledge-media.mapper");

async function ensureEntityExists(entityId) {
  const entity =
    await repository.findEntityById(entityId);

  if (!entity) {
    throw new NotFoundError(
      "Entité Knowledge introuvable.",
      {
        entityId,
      }
    );
  }

  return entity;
}

async function ensureMediaBelongsToEntity(
  entityId,
  mediaId
) {
  const media =
    await repository.findById(mediaId);

  if (
    !media ||
    String(
      media[getFieldName("entityId")]
    ) !== String(entityId)
  ) {
    throw new NotFoundError(
      "Média Knowledge introuvable.",
      {
        entityId,
        mediaId,
      }
    );
  }

  return media;
}

async function list(entityId) {
  await ensureEntityExists(entityId);

  const records =
    await repository.findAllForEntity(
      entityId
    );

  return toListDto(records);
}

async function create(entityId, payload) {
  await ensureEntityExists(entityId);

  const data =
    validateCreatePayload(payload);

  if (
    data.isPrimary &&
    !getFieldName("isPrimary")
  ) {
    throw new ValidationError(
      "Le schéma actuel ne permet pas de définir un média principal."
    );
  }

  if (
    data.isPrimary &&
    getFieldName("isPrimary")
  ) {
    await repository.unsetPrimary(
      entityId
    );
  }

  const record =
    await repository.create(
      entityId,
      data
    );

  return toDto(record);
}

async function update(
  entityId,
  mediaId,
  payload
) {
  await ensureEntityExists(entityId);

  await ensureMediaBelongsToEntity(
    entityId,
    mediaId
  );

  const data =
    validateUpdatePayload(payload);

  if (
    data.isPrimary === true &&
    !getFieldName("isPrimary")
  ) {
    throw new ValidationError(
      "Le schéma actuel ne permet pas de définir un média principal."
    );
  }

  if (
    data.isPrimary === true &&
    getFieldName("isPrimary")
  ) {
    await repository.unsetPrimary(
      entityId,
      mediaId
    );
  }

  const record =
    await repository.update(
      mediaId,
      data
    );

  return toDto(record);
}

async function remove(
  entityId,
  mediaId
) {
  await ensureEntityExists(entityId);

  await ensureMediaBelongsToEntity(
    entityId,
    mediaId
  );

  await repository.remove(mediaId);

  return {
    id: mediaId,
    deleted: true,
  };
}

async function reorder(
  entityId,
  payload
) {
  await ensureEntityExists(entityId);

  if (!getFieldName("position")) {
    throw new ValidationError(
      "Le schéma actuel ne permet pas de réordonner les médias."
    );
  }

  const items =
    validateReorderPayload(payload);

  const current =
    await repository.findAllForEntity(
      entityId
    );

  const currentIds = new Set(
    current.map(
      (record) =>
        String(
          record[getFieldName("id")]
        )
    )
  );

  for (const item of items) {
    if (!currentIds.has(String(item.id))) {
      throw new ValidationError(
        "Un média ne dépend pas de cette connaissance.",
        {
          mediaId: item.id,
        }
      );
    }
  }

  await repository.reorder(
    entityId,
    items
  );

  const records =
    await repository.findAllForEntity(
      entityId
    );

  return toListDto(records);
}

module.exports = {
  list,
  create,
  update,
  remove,
  reorder,
};
