function toBlockDto(block) {
  return {
    id: block.id,
    entityId: block.entityId,
    type: block.type,
    title: block.title,
    content: block.content,
    position: block.position,
    status: block.status,
    language: block.language,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}

function toBlockListDto(blocks) {
  return {
    data: blocks.map(toBlockDto),
    total: blocks.length,
  };
}

module.exports = {
  toBlockDto,
  toBlockListDto,
};
