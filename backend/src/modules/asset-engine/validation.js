const { ValidationError } = require("../../core/errors");
const slugify = require("../../core/utils/slugify");

const ALLOWED_STATUSES = [
  "draft",
  "review",
  "approved",
  "published",
  "archived"
];

function requireTenantId(req) {
  const tenantId = String(req.headers["x-tenant-id"] || "").trim();

  if (!tenantId) {
    throw new ValidationError(
      "L’en-tête x-tenant-id est obligatoire."
    );
  }

  return tenantId;
}

function getUserId(req) {
  const userId = String(req.headers["x-user-id"] || "").trim();
  return userId || null;
}

function validateJsonObject(value, fieldName, required = false) {
  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(
        `Le champ ${fieldName} est obligatoire.`
      );
    }

    return value;
  }

  if (
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new ValidationError(
      `Le champ ${fieldName} doit être un objet JSON.`
    );
  }

  return value;
}

function validateTags(tags) {
  if (tags === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(tags) ||
    tags.some((tag) => typeof tag !== "string")
  ) {
    throw new ValidationError(
      "Le champ tags doit être un tableau de chaînes."
    );
  }

  return [...new Set(
    tags
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  )];
}

function validateCreateAsset(body = {}) {
  const title =
    typeof body.title === "string"
      ? body.title.trim()
      : "";

  const type =
    typeof body.type === "string"
      ? body.type.trim().toUpperCase()
      : "";

  if (!title) {
    throw new ValidationError(
      "Le titre de l’Asset est obligatoire."
    );
  }

  if (!type) {
    throw new ValidationError(
      "Le type de l’Asset est obligatoire."
    );
  }

  const slug = slugify(body.slug || title);

  if (!slug) {
    throw new ValidationError(
      "Impossible de générer le slug de l’Asset."
    );
  }

  const status = body.status || "draft";

  if (!ALLOWED_STATUSES.includes(status)) {
    throw new ValidationError(
      `Statut invalide : ${status}.`
    );
  }

  return {
    type,
    status,
    title,
    slug,
    summary:
      typeof body.summary === "string"
        ? body.summary.trim() || null
        : null,
    payload: validateJsonObject(
      body.payload,
      "payload",
      true
    ),
    metadata:
      validateJsonObject(
        body.metadata,
        "metadata"
      ) ?? null,
    tags: validateTags(body.tags) || []
  };
}

function validateUpdateAsset(body = {}) {
  const data = {};

  if (body.title !== undefined) {
    if (
      typeof body.title !== "string" ||
      !body.title.trim()
    ) {
      throw new ValidationError(
        "Le titre ne peut pas être vide."
      );
    }

    data.title = body.title.trim();
  }

  if (body.type !== undefined) {
    if (
      typeof body.type !== "string" ||
      !body.type.trim()
    ) {
      throw new ValidationError(
        "Le type ne peut pas être vide."
      );
    }

    data.type = body.type.trim().toUpperCase();
  }

  if (body.slug !== undefined) {
    const slug = slugify(body.slug);

    if (!slug) {
      throw new ValidationError(
        "Le slug est invalide."
      );
    }

    data.slug = slug;
  }

  if (body.summary !== undefined) {
    data.summary =
      typeof body.summary === "string"
        ? body.summary.trim() || null
        : null;
  }

  if (body.payload !== undefined) {
    data.payload = validateJsonObject(
      body.payload,
      "payload",
      true
    );
  }

  if (body.metadata !== undefined) {
    data.metadata =
      validateJsonObject(
        body.metadata,
        "metadata"
      ) ?? null;
  }

  if (body.tags !== undefined) {
    data.tags = validateTags(body.tags);
  }

  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      throw new ValidationError(
        `Statut invalide : ${body.status}.`
      );
    }

    data.status = body.status;
  }

  if (Object.keys(data).length === 0) {
    throw new ValidationError(
      "Aucune modification valide n’a été fournie."
    );
  }

  return data;
}

function parseListQuery(query = {}) {
  const page = Math.max(
    1,
    Number.parseInt(query.page, 10) || 1
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.parseInt(query.limit, 10) || 20
    )
  );

  return {
    page,
    limit,
    type:
      typeof query.type === "string"
        ? query.type.trim().toUpperCase()
        : undefined,
    status:
      typeof query.status === "string"
        ? query.status.trim()
        : undefined,
    search:
      typeof query.search === "string"
        ? query.search.trim()
        : undefined
  };
}

module.exports = {
  requireTenantId,
  getUserId,
  validateCreateAsset,
  validateUpdateAsset,
  parseListQuery
};
