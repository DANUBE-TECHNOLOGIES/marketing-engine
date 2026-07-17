const repository = require(
  "./knowledge-block.repository"
);

const {
  ValidationError,
  NotFoundError,
} = require("../core/errors");

const {
  validateCreatePayload,
  validateUpdatePayload,
  validateReorderPayload,
} = require("./knowledge-block.validation");

const {
  toBlockDto,
  toBlockListDto,
} = require("./knowledge-block.mapper");

async function ensureEntityExists(entityId) {
  if (!entityId) {
    throw new ValidationError(
      "L’identifiant Knowledge est obligatoire."
    );
  }

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

async function ensureBlockBelongsToEntity(
  entityId,
  blockId
) {
  const block = await repository.findById(blockId);

  if (
    !block ||
    block.entityId !== entityId
  ) {
    throw new NotFoundError(
      "Bloc de contenu introuvable.",
      {
        entityId,
        blockId,
      }
    );
  }

  return block;
}

async function list(entityId) {
  await ensureEntityExists(entityId);

  const blocks =
    await repository.findAllByEntityId(entityId);

  return toBlockListDto(blocks);
}

async function create(entityId, payload) {
  await ensureEntityExists(entityId);

  const data = validateCreatePayload(payload);

  if (data.position === undefined) {
    const lastPosition =
      await repository.findLastPosition(entityId);

    data.position = lastPosition + 1;
  }

  const block = await repository.create(
    entityId,
    data
  );

  return toBlockDto(block);
}

async function update(
  entityId,
  blockId,
  payload
) {
  await ensureEntityExists(entityId);

  const current =
    await ensureBlockBelongsToEntity(
      entityId,
      blockId
    );

  const data = validateUpdatePayload(payload);

  if (
    payload.content !== undefined &&
    payload.type === undefined
  ) {
    data.content = require(
      "./knowledge-block.validation"
    ).validateCreatePayload({
      type: current.type,
      content: payload.content,
      title: current.title,
      status: current.status,
      language: current.language,
    }).content;
  }

  const block = await repository.update(
    blockId,
    data
  );

  return toBlockDto(block);
}

async function remove(entityId, blockId) {
  await ensureEntityExists(entityId);

  await ensureBlockBelongsToEntity(
    entityId,
    blockId
  );

  await repository.remove(blockId);

  return {
    id: blockId,
    deleted: true,
  };
}

async function reorder(entityId, payload) {
  await ensureEntityExists(entityId);

  const data = validateReorderPayload(payload);

  const existingBlocks =
    await repository.findAllByEntityId(entityId);

  const existingIds = new Set(
    existingBlocks.map((block) => block.id)
  );

  const requestedIds = new Set(
    data.blocks.map((block) => block.id)
  );

  if (
    existingIds.size !== requestedIds.size ||
    [...existingIds].some(
      (id) => !requestedIds.has(id)
    )
  ) {
    throw new ValidationError(
      "La réorganisation doit contenir exactement tous les blocs de l’entité.",
      {
        existingIds: [...existingIds],
        requestedIds: [...requestedIds],
      }
    );
  }

  await repository.reorder(
    entityId,
    data.blocks
  );

  const blocks =
    await repository.findAllByEntityId(entityId);

  return toBlockListDto(blocks);
}

module.exports = {
  list,
  create,
  update,
  remove,
  reorder,
};
