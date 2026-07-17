function mapRelation(relation, direction) {
  const relatedEntity =
    direction === "outgoing"
      ? relation.target
      : relation.source;

  return {
    id: relation.id,
    direction,
    relationType: relation.relationType,
    position: relation.position,
    metadata: relation.metadata,
    entity: relatedEntity
      ? {
          id: relatedEntity.id,
          type: relatedEntity.type,
          slug: relatedEntity.slug,
          title: relatedEntity.title,
          status: relatedEntity.status,
          language: relatedEntity.language,
        }
      : null,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
  };
}

function toSummaryDto(entity) {
  return {
    id: entity.id,
    type: entity.type,
    slug: entity.slug,
    title: entity.title,
    summary: entity.summary,
    status: entity.status,
    language: entity.language,
    metadata: entity.metadata,
    publishedAt: entity.publishedAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

function toDetailDto(entity) {
  return {
    ...toSummaryDto(entity),
    contentBlocks: entity.contentBlocks || [],
    mediaAssets: entity.mediaAssets || [],
    relations: [
      ...(entity.outgoingRelations || []).map((relation) =>
        mapRelation(relation, "outgoing")
      ),
      ...(entity.incomingRelations || []).map((relation) =>
        mapRelation(relation, "incoming")
      ),
    ],
  };
}

function toPaginatedDto(items, pagination) {
  return {
    data: items.map(toSummaryDto),
    pagination,
  };
}

module.exports = {
  toSummaryDto,
  toDetailDto,
  toPaginatedDto,
};
