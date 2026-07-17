const { ValidationError } = require("../core/errors");

const {
  BLOCK_TYPES,
  BLOCK_STATUSES,
  DEFAULT_BLOCK_STATUS,
  DEFAULT_BLOCK_LANGUAGE,
} = require("./knowledge-block.constants");

function normalizeString(value) {
  return typeof value === "string"
    ? value.trim()
    : value;
}

function validateType(type) {
  const normalized = normalizeString(type)?.toLowerCase();

  if (!normalized) {
    throw new ValidationError(
      "Le type du bloc est obligatoire."
    );
  }

  if (!BLOCK_TYPES[normalized]) {
    throw new ValidationError(
      "Type de bloc non autorisé.",
      {
        received: normalized,
        allowed: Object.keys(BLOCK_TYPES),
      }
    );
  }

  return normalized;
}

function validateStatus(status) {
  const normalized =
    normalizeString(status || DEFAULT_BLOCK_STATUS)
      ?.toLowerCase();

  if (!BLOCK_STATUSES.includes(normalized)) {
    throw new ValidationError(
      "Statut de bloc non autorisé.",
      {
        received: normalized,
        allowed: BLOCK_STATUSES,
      }
    );
  }

  return normalized;
}

function validateLanguage(language) {
  const normalized =
    normalizeString(
      language || DEFAULT_BLOCK_LANGUAGE
    )?.toLowerCase();

  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(normalized)) {
    throw new ValidationError(
      "La langue doit être un code comme fr, en ou fr-fr."
    );
  }

  return normalized;
}

function validatePosition(position) {
  if (position === undefined || position === null) {
    return undefined;
  }

  const normalized = Number(position);

  if (
    !Number.isInteger(normalized) ||
    normalized < 0
  ) {
    throw new ValidationError(
      "La position doit être un entier positif ou nul."
    );
  }

  return normalized;
}

function validateContent(type, content) {
  if (
    !content ||
    typeof content !== "object" ||
    Array.isArray(content)
  ) {
    throw new ValidationError(
      "Le contenu du bloc doit être un objet JSON."
    );
  }

  const definition = BLOCK_TYPES[type];

  for (const field of definition.requiredFields) {
    const value = content[field];

    if (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    ) {
      throw new ValidationError(
        `Le champ content.${field} est obligatoire pour un bloc ${type}.`
      );
    }
  }

  if (
    type === "heading" &&
    ![1, 2, 3, 4, 5, 6].includes(
      Number(content.level)
    )
  ) {
    throw new ValidationError(
      "Le niveau d’un titre doit être compris entre 1 et 6."
    );
  }

  if (
    type === "list" &&
    !Array.isArray(content.items)
  ) {
    throw new ValidationError(
      "content.items doit être un tableau."
    );
  }

  if (
    type === "cta" &&
    typeof content.url !== "string"
  ) {
    throw new ValidationError(
      "content.url doit être une chaîne."
    );
  }

  return content;
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

  const type = validateType(payload.type);

  return {
    type,
    title:
      normalizeString(payload.title) || null,
    content: validateContent(type, payload.content),
    position: validatePosition(payload.position),
    status: validateStatus(payload.status),
    language: validateLanguage(payload.language),
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
    "type",
    "title",
    "content",
    "position",
    "status",
    "language",
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

  if (payload.type !== undefined) {
    data.type = validateType(payload.type);
  }

  if (payload.title !== undefined) {
    data.title =
      normalizeString(payload.title) || null;
  }

  if (payload.position !== undefined) {
    data.position = validatePosition(
      payload.position
    );
  }

  if (payload.status !== undefined) {
    data.status = validateStatus(payload.status);
  }

  if (payload.language !== undefined) {
    data.language = validateLanguage(
      payload.language
    );
  }

  if (payload.content !== undefined) {
    const effectiveType =
      data.type || payload.currentType;

    if (!effectiveType) {
      data.content = payload.content;
    } else {
      data.content = validateContent(
        effectiveType,
        payload.content
      );
    }
  }

  return data;
}

function validateReorderPayload(payload = {}) {
  if (!Array.isArray(payload.blocks)) {
    throw new ValidationError(
      "Le champ blocks doit être un tableau."
    );
  }

  if (payload.blocks.length === 0) {
    throw new ValidationError(
      "La liste des blocs ne peut pas être vide."
    );
  }

  const ids = new Set();

  const blocks = payload.blocks.map(
    (item, index) => {
      if (
        !item ||
        typeof item !== "object" ||
        !item.id
      ) {
        throw new ValidationError(
          `Le bloc à la position ${index} est invalide.`
        );
      }

      if (ids.has(item.id)) {
        throw new ValidationError(
          `Le bloc ${item.id} apparaît plusieurs fois.`
        );
      }

      ids.add(item.id);

      return {
        id: String(item.id),
        position:
          item.position === undefined
            ? index
            : validatePosition(item.position),
      };
    }
  );

  return {
    blocks,
  };
}

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateReorderPayload,
};
