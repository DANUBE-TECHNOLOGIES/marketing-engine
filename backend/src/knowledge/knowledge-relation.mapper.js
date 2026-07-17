const {
  RELATION_TYPES,
} = require("./knowledge-relation.constants");

function mapEntity(entity) {
  if (!entity) {
    return null;
  }

  return {
    id: entity.id,
    type: entity.type,
    slug: entity.slug,
    title: entity.title,
    summary: entity.summary,
    status: entity.status,
    language: entity.language,
  };
}

function toOutgoingDto(relation) {
  const definition =
    RELATION_TYPES[relation.relationType];

  return {
    id: relation.id,
    direction: "outgoing",
    relationType: relation.relationType,
    label:
      definition?.label ||
      relation.relationType,
    inverseLabel:
      definition?.inverseLabel || null,
    sourceId: relation.sourceId,
    targetId: relation.targetId,
    relatedEntity: mapEntity(relation.target),
    position: relation.position,
    metadata: relation.metadata,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

function toIncomingDto(relation) {
  const definition =
    RELATION_TYPES[relation.relationType];

  return {
    id: relation.id,
    direction: "incoming",
    relationType: relation.relationType,
    label:
      definition?.inverseLabel ||
      relation.relationType,
    inverseLabel:
      definition?.label || null,
    sourceId: relation.sourceId,
    targetId: relation.targetId,
    relatedEntity: mapEntity(relation.source),
    position: relation.position,
    metadata: relation.metadata,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

function toDetailDto(relation) {
  const definition =
    RELATION_TYPES[relation.relationType];

  return {
    id: relation.id,
    relationType: relation.relationType,
    label:
      definition?.label ||
      relation.relationType,
    inverseLabel:
      definition?.inverseLabel || null,
    source: mapEntity(relation.source),
    target: mapEntity(relation.target),
    position: relation.position,
    metadata: relation.metadata,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

function toListDto(result) {
  const outgoing = result.outgoing.map(
    toOutgoingDto
  );

  const incoming = result.incoming.map(
    toIncomingDto
  );

  return {
    data: {
      outgoing,
      incoming,
      all: [
        ...outgoing,
        ...incoming,
      ],
    },
    totals: {
      outgoing: outgoing.length,
      incoming: incoming.length,
      all: outgoing.length + incoming.length,
    },
  };
}

module.exports = {
  toDetailDto,
  toListDto,
};
