const { ValidationError } = require("../core/errors");

const {
  RELATION_TYPES,
} = require("./knowledge-relation.constants");

function normalizeString(value) {
  return typeof value === "string"
    ? value.trim()
    : value;
}

function validateRelationType(value) {
  const relationType =
    normalizeString(value)?.toLowerCase();

  if (!relationType) {
    throw new ValidationError(
      "Le type de relation est obligatoire."
    );
  }

  if (!RELATION_TYPES[relationType]) {
    throw new ValidationError(
      "Type de relation non autorisé.",
      {
        received: relationType,
        allowed: Object.keys(RELATION_TYPES),
      }
    );
  }

  return relationType;
}

function validateTargetId(value) {
  const targetId = normalizeString(value);

  if (!targetId) {
    throw new ValidationError(
      "L’identifiant de la connaissance cible est obligatoire."
    );
  }

  return targetId;
}

function validatePosition(value) {
  if (value === undefined || value === null) {
    return 0;
  }

  const position = Number(value);

  if (
    !Number.isInteger(position) ||
    position < 0
  ) {
    throw new ValidationError(
      "La position doit être un entier positif ou nul."
    );
  }

  return position;
}

function validateMetadata(value) {
  if (value === undefined || value === null) {
    return null;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new ValidationError(
      "Les métadonnées doivent être un objet JSON."
    );
  }

  return value;
}

function validateCreatePayload(payload = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new ValidationError(
      "Le corps de la requête est invalide."
    );
  }

  return {
    targetId: validateTargetId(payload.targetId),
    relationType: validateRelationType(
      payload.relationType
    ),
    position: validatePosition(payload.position),
    metadata: validateMetadata(payload.metadata),
  };
}

function validateUpdatePayload(payload = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload)
  ) {
    throw new ValidationError(
      "Le corps de la requête est invalide."
    );
  }

  const allowedFields = [
    "targetId",
    "relationType",
    "position",
    "metadata",
  ];

  const fields = Object.keys(payload);

  if (fields.length === 0) {
    throw new ValidationError(
      "Aucune modification n’a été fournie."
    );
  }

  const unknownFields = fields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length > 0) {
    throw new ValidationError(
      "Champs non autorisés.",
      {
        fields: unknownFields,
      }
    );
  }

  const data = {};

  if (payload.targetId !== undefined) {
    data.targetId = validateTargetId(
      payload.targetId
    );
  }

  if (payload.relationType !== undefined) {
    data.relationType = validateRelationType(
      payload.relationType
    );
  }

  if (payload.position !== undefined) {
    data.position = validatePosition(
      payload.position
    );
  }

  if (payload.metadata !== undefined) {
    data.metadata = validateMetadata(
      payload.metadata
    );
  }

  return data;
}

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
};
