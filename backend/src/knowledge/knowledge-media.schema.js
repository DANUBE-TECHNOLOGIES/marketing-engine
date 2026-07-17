const { Prisma } = require("@prisma/client");

const MODEL_NAME = "KnowledgeMediaAsset";

const FIELD_ALIASES = {
  id: [
    "id",
  ],

  entityId: [
    "knowledgeEntityId",
    "entityId",
    "knowledgeId",
    "ownerId",
  ],

  url: [
    "url",
    "src",
    "uri",
    "path",
    "publicUrl",
    "sourceUrl",
  ],

  type: [
    "type",
    "mediaType",
    "kind",
    "assetType",
  ],

  title: [
    "title",
    "name",
    "label",
    "caption",
  ],

  altText: [
    "altText",
    "alt",
    "alternativeText",
    "description",
  ],

  position: [
    "position",
    "sortOrder",
    "order",
    "rank",
  ],

  isPrimary: [
    "isPrimary",
    "primary",
    "featured",
    "isFeatured",
    "cover",
    "isCover",
  ],

  width: [
    "width",
    "pixelWidth",
  ],

  height: [
    "height",
    "pixelHeight",
  ],

  mimeType: [
    "mimeType",
    "contentType",
    "format",
  ],

  metadata: [
    "metadata",
    "meta",
    "properties",
  ],

  createdAt: [
    "createdAt",
  ],

  updatedAt: [
    "updatedAt",
  ],
};

function getModel() {
  const model =
    Prisma.dmmf?.datamodel?.models?.find(
      (entry) => entry.name === MODEL_NAME
    );

  if (!model) {
    throw new Error(
      `${MODEL_NAME} est absent du client Prisma généré.`
    );
  }

  return model;
}

function findField(model, aliases) {
  for (const alias of aliases) {
    const field = model.fields.find(
      (entry) => entry.name === alias
    );

    if (field) {
      return field;
    }
  }

  return null;
}

function buildDescriptor() {
  const model = getModel();

  const semanticFields = {};

  for (const [semantic, aliases] of Object.entries(
    FIELD_ALIASES
  )) {
    semanticFields[semantic] =
      findField(model, aliases);
  }

  const missing = [
    "id",
    "entityId",
    "url",
  ].filter(
    (semantic) => !semanticFields[semantic]
  );

  if (missing.length > 0) {
    throw new Error(
      [
        "Le modèle KnowledgeMediaAsset n’est pas compatible.",
        `Champs sémantiques manquants : ${missing.join(", ")}.`,
        `Champs présents : ${model.fields
          .map((field) => field.name)
          .join(", ")}.`,
      ].join(" ")
    );
  }

  const unsupportedRequiredFields =
    model.fields.filter((field) => {
      if (field.kind !== "scalar") {
        return false;
      }

      if (field.isId) {
        return false;
      }

      if (!field.isRequired) {
        return false;
      }

      if (field.hasDefaultValue) {
        return false;
      }

      if (
        Object.values(semanticFields).some(
          (semanticField) =>
            semanticField?.name === field.name
        )
      ) {
        return false;
      }

      return true;
    });

  if (unsupportedRequiredFields.length > 0) {
    throw new Error(
      [
        "Le modèle comporte des champs scalaires obligatoires",
        "sans valeur par défaut que le Media Engine ne sait",
        "pas encore alimenter :",
        unsupportedRequiredFields
          .map((field) => field.name)
          .join(", "),
      ].join(" ")
    );
  }

  return {
    modelName: MODEL_NAME,

    fields: Object.fromEntries(
      Object.entries(semanticFields).map(
        ([semantic, field]) => [
          semantic,
          field?.name || null,
        ]
      )
    ),

    fieldDefinitions: Object.fromEntries(
      Object.entries(semanticFields).map(
        ([semantic, field]) => [
          semantic,
          field
            ? {
                name: field.name,
                type: field.type,
                kind: field.kind,
                isRequired: field.isRequired,
                isList: field.isList,
                hasDefaultValue:
                  field.hasDefaultValue,
              }
            : null,
        ]
      )
    ),

    allFields: model.fields.map((field) => ({
      name: field.name,
      kind: field.kind,
      type: field.type,
      isRequired: field.isRequired,
      hasDefaultValue:
        field.hasDefaultValue,
    })),
  };
}

let cachedDescriptor;

function getMediaSchema() {
  if (!cachedDescriptor) {
    cachedDescriptor = buildDescriptor();
  }

  return cachedDescriptor;
}

function getFieldName(semantic) {
  return getMediaSchema().fields[semantic] || null;
}

function readField(record, semantic) {
  const fieldName = getFieldName(semantic);

  if (!fieldName || !record) {
    return undefined;
  }

  return record[fieldName];
}

function writeField(target, semantic, value) {
  const fieldName = getFieldName(semantic);

  if (
    !fieldName ||
    value === undefined
  ) {
    return target;
  }

  target[fieldName] = value;

  return target;
}

module.exports = {
  getMediaSchema,
  getFieldName,
  readField,
  writeField,
};
