const {
  ValidationError,
} = require("../core/errors");

function normalizeString(value) {
  return typeof value === "string"
    ? value.trim()
    : value;
}

function validateUrl(value) {
  const url = normalizeString(value);

  if (!url) {
    throw new ValidationError(
      "L’URL du média est obligatoire."
    );
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError(
      "L’URL du média est invalide."
    );
  }

  if (
    !["http:", "https:"].includes(
      parsed.protocol
    )
  ) {
    throw new ValidationError(
      "Seules les URL HTTP et HTTPS sont autorisées."
    );
  }

  return url;
}

function optionalString(value, fieldLabel) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(
      `${fieldLabel} doit être une chaîne de caractères.`
    );
  }

  return value.trim();
}

function optionalInteger(
  value,
  fieldLabel,
  minimum = 0
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const result = Number(value);

  if (
    !Number.isInteger(result) ||
    result < minimum
  ) {
    throw new ValidationError(
      `${fieldLabel} doit être un entier supérieur ou égal à ${minimum}.`
    );
  }

  return result;
}

function optionalBoolean(value, fieldLabel) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  if (typeof value !== "boolean") {
    throw new ValidationError(
      `${fieldLabel} doit être un booléen.`
    );
  }

  return value;
}

function optionalMetadata(value) {
  if (
    value === undefined ||
    value === null
  ) {
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
    url: validateUrl(payload.url),

    type:
      optionalString(
        payload.type,
        "Le type de média"
      ) || "image",

    title: optionalString(
      payload.title,
      "Le titre"
    ),

    altText: optionalString(
      payload.altText,
      "Le texte alternatif"
    ),

    position:
      optionalInteger(
        payload.position,
        "La position"
      ) ?? 0,

    isPrimary:
      optionalBoolean(
        payload.isPrimary,
        "Le statut principal"
      ) ?? false,

    width: optionalInteger(
      payload.width,
      "La largeur",
      1
    ),

    height: optionalInteger(
      payload.height,
      "La hauteur",
      1
    ),

    mimeType: optionalString(
      payload.mimeType,
      "Le type MIME"
    ),

    metadata: optionalMetadata(
      payload.metadata
    ),
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
    "url",
    "type",
    "title",
    "altText",
    "position",
    "isPrimary",
    "width",
    "height",
    "mimeType",
    "metadata",
  ];

  const suppliedFields =
    Object.keys(payload);

  if (suppliedFields.length === 0) {
    throw new ValidationError(
      "Aucune modification n’a été fournie."
    );
  }

  const unknownFields =
    suppliedFields.filter(
      (field) =>
        !allowedFields.includes(field)
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

  if (payload.url !== undefined) {
    data.url = validateUrl(payload.url);
  }

  if (payload.type !== undefined) {
    data.type = optionalString(
      payload.type,
      "Le type de média"
    );
  }

  if (payload.title !== undefined) {
    data.title = optionalString(
      payload.title,
      "Le titre"
    );
  }

  if (payload.altText !== undefined) {
    data.altText = optionalString(
      payload.altText,
      "Le texte alternatif"
    );
  }

  if (payload.position !== undefined) {
    data.position = optionalInteger(
      payload.position,
      "La position"
    );
  }

  if (payload.isPrimary !== undefined) {
    data.isPrimary = optionalBoolean(
      payload.isPrimary,
      "Le statut principal"
    );
  }

  if (payload.width !== undefined) {
    data.width = optionalInteger(
      payload.width,
      "La largeur",
      1
    );
  }

  if (payload.height !== undefined) {
    data.height = optionalInteger(
      payload.height,
      "La hauteur",
      1
    );
  }

  if (payload.mimeType !== undefined) {
    data.mimeType = optionalString(
      payload.mimeType,
      "Le type MIME"
    );
  }

  if (payload.metadata !== undefined) {
    data.metadata = optionalMetadata(
      payload.metadata
    );
  }

  return data;
}

function validateReorderPayload(payload = {}) {
  if (
    !payload ||
    !Array.isArray(payload.media)
  ) {
    throw new ValidationError(
      "Le champ media doit être un tableau."
    );
  }

  if (payload.media.length === 0) {
    throw new ValidationError(
      "La liste de réorganisation est vide."
    );
  }

  const seen = new Set();

  return payload.media.map(
    (item, index) => {
      if (
        !item ||
        typeof item !== "object"
      ) {
        throw new ValidationError(
          `Le média à l’index ${index} est invalide.`
        );
      }

      const id =
        optionalString(
          item.id,
          "L’identifiant du média"
        );

      if (!id) {
        throw new ValidationError(
          `L’identifiant du média à l’index ${index} est obligatoire.`
        );
      }

      if (seen.has(id)) {
        throw new ValidationError(
          `Le média ${id} est présent plusieurs fois.`
        );
      }

      seen.add(id);

      return {
        id,
        position:
          optionalInteger(
            item.position,
            "La position"
          ) ?? index,
      };
    }
  );
}

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateReorderPayload,
};
