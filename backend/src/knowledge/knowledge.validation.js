const { ValidationError } = require("../core/errors");
const {
  KNOWLEDGE_STATUSES,
  KNOWLEDGE_TYPES,
  DEFAULT_LANGUAGE,
  DEFAULT_STATUS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} = require("./knowledge.constants");

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : value;
}

function validateMetadata(metadata) {
  if (
    metadata !== undefined &&
    metadata !== null &&
    (typeof metadata !== "object" || Array.isArray(metadata))
  ) {
    throw new ValidationError(
      "Le champ metadata doit être un objet JSON."
    );
  }

  return metadata;
}

function validateType(type) {
  const normalizedType = normalizeString(type)?.toLowerCase();

  if (!normalizedType) {
    throw new ValidationError("Le type est obligatoire.");
  }

  if (!KNOWLEDGE_TYPES.includes(normalizedType)) {
    throw new ValidationError("Type Knowledge non autorisé.", {
      received: normalizedType,
      allowed: KNOWLEDGE_TYPES,
    });
  }

  return normalizedType;
}

function validateStatus(status) {
  const normalizedStatus =
    normalizeString(status || DEFAULT_STATUS)?.toLowerCase();

  if (!KNOWLEDGE_STATUSES.includes(normalizedStatus)) {
    throw new ValidationError("Statut Knowledge non autorisé.", {
      received: normalizedStatus,
      allowed: KNOWLEDGE_STATUSES,
    });
  }

  return normalizedStatus;
}

function validateLanguage(language) {
  const normalizedLanguage =
    normalizeString(language || DEFAULT_LANGUAGE)?.toLowerCase();

  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(normalizedLanguage)) {
    throw new ValidationError(
      "La langue doit utiliser un code comme fr, en ou fr-fr."
    );
  }

  return normalizedLanguage;
}

function validatePublishedAt(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(
      "La date publishedAt n'est pas valide."
    );
  }

  return date;
}

function validateCreatePayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError("Le corps de la requête est invalide.");
  }

  const title = normalizeString(payload.title);

  if (!title) {
    throw new ValidationError("Le titre est obligatoire.");
  }

  if (title.length > 200) {
    throw new ValidationError(
      "Le titre ne peut pas dépasser 200 caractères."
    );
  }

  const slug = normalizeString(payload.slug)?.toLowerCase();

  if (slug && slug.length > 220) {
    throw new ValidationError(
      "Le slug ne peut pas dépasser 220 caractères."
    );
  }

  const summary = normalizeString(payload.summary);

  return {
    type: validateType(payload.type),
    title,
    slug: slug || undefined,
    summary: summary || null,
    status: validateStatus(payload.status),
    language: validateLanguage(payload.language),
    metadata: validateMetadata(payload.metadata) ?? null,
    publishedAt: validatePublishedAt(payload.publishedAt),
  };
}

function validateUpdatePayload(payload = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ValidationError("Le corps de la requête est invalide.");
  }

  const allowedFields = [
    "type",
    "slug",
    "title",
    "summary",
    "status",
    "language",
    "metadata",
    "publishedAt",
  ];

  const receivedFields = Object.keys(payload);
  const unknownFields = receivedFields.filter(
    (field) => !allowedFields.includes(field)
  );

  if (unknownFields.length > 0) {
    throw new ValidationError("Champs non autorisés.", {
      fields: unknownFields,
    });
  }

  if (receivedFields.length === 0) {
    throw new ValidationError(
      "Aucune modification n'a été fournie."
    );
  }

  const data = {};

  if (payload.type !== undefined) {
    data.type = validateType(payload.type);
  }

  if (payload.title !== undefined) {
    const title = normalizeString(payload.title);

    if (!title) {
      throw new ValidationError("Le titre ne peut pas être vide.");
    }

    if (title.length > 200) {
      throw new ValidationError(
        "Le titre ne peut pas dépasser 200 caractères."
      );
    }

    data.title = title;
  }

  if (payload.slug !== undefined) {
    const slug = normalizeString(payload.slug)?.toLowerCase();

    if (!slug) {
      throw new ValidationError("Le slug ne peut pas être vide.");
    }

    if (slug.length > 220) {
      throw new ValidationError(
        "Le slug ne peut pas dépasser 220 caractères."
      );
    }

    data.slug = slug;
  }

  if (payload.summary !== undefined) {
    data.summary = normalizeString(payload.summary) || null;
  }

  if (payload.status !== undefined) {
    data.status = validateStatus(payload.status);
  }

  if (payload.language !== undefined) {
    data.language = validateLanguage(payload.language);
  }

  if (payload.metadata !== undefined) {
    data.metadata = validateMetadata(payload.metadata);
  }

  if (payload.publishedAt !== undefined) {
    data.publishedAt = validatePublishedAt(payload.publishedAt);
  }

  return data;
}

function validateListQuery(query = {}) {
  const page = Math.max(
    1,
    Number.parseInt(query.page || "1", 10) || 1
  );

  const requestedPageSize =
    Number.parseInt(query.pageSize || String(DEFAULT_PAGE_SIZE), 10) ||
    DEFAULT_PAGE_SIZE;

  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, requestedPageSize)
  );

  const type = query.type
    ? validateType(query.type)
    : undefined;

  const status = query.status
    ? validateStatus(query.status)
    : undefined;

  const language = query.language
    ? validateLanguage(query.language)
    : undefined;

  const search = normalizeString(query.search);

  return {
    page,
    pageSize,
    type,
    status,
    language,
    search: search || undefined,
  };
}

module.exports = {
  validateCreatePayload,
  validateUpdatePayload,
  validateListQuery,
};
