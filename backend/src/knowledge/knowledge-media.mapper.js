const {
  readField,
} = require("./knowledge-media.schema");

function toDto(record) {
  if (!record) {
    return null;
  }

  return {
    id: readField(record, "id"),

    entityId:
      readField(record, "entityId"),

    url:
      readField(record, "url"),

    type:
      readField(record, "type") ||
      "image",

    title:
      readField(record, "title") ||
      null,

    altText:
      readField(record, "altText") ||
      null,

    position:
      readField(record, "position") ??
      0,

    isPrimary:
      readField(record, "isPrimary") ??
      false,

    width:
      readField(record, "width") ||
      null,

    height:
      readField(record, "height") ||
      null,

    mimeType:
      readField(record, "mimeType") ||
      null,

    metadata:
      readField(record, "metadata") ||
      null,

    createdAt:
      readField(record, "createdAt") ||
      null,

    updatedAt:
      readField(record, "updatedAt") ||
      null,
  };
}

function toListDto(records) {
  const data = records.map(toDto);

  return {
    data,
    total: data.length,
    primary:
      data.find(
        (item) => item.isPrimary
      ) || null,
  };
}

module.exports = {
  toDto,
  toListDto,
};
