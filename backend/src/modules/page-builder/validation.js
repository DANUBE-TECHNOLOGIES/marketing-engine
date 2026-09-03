"use strict";

const { pageBuilderError } = require("./errors");

const SAFE_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "tel:",
]);

function isPlainObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function validateUrl(value, path) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw pageBuilderError(
      `${path} doit être une URL valide.`,
      "INVALID_BLOCK_URL",
      400,
      { path }
    );
  }

  const trimmed = value.trim();

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#")
  ) {
    return trimmed;
  }

  let url;

  try {
    url = new URL(trimmed);
  } catch {
    throw pageBuilderError(
      `${path} doit être une URL valide.`,
      "INVALID_BLOCK_URL",
      400,
      { path }
    );
  }

  if (!SAFE_PROTOCOLS.has(url.protocol)) {
    throw pageBuilderError(
      `${path} utilise un protocole interdit.`,
      "UNSAFE_BLOCK_URL",
      400,
      { path, protocol: url.protocol }
    );
  }

  return trimmed;
}

function validateCta(value, path, nullable) {
  if (value === null && nullable) return null;

  if (!isPlainObject(value)) {
    throw pageBuilderError(
      `${path} doit être un appel à l’action.`,
      "INVALID_BLOCK_CTA",
      400,
      { path }
    );
  }

  const label = String(value.label || "").trim();
  const href = String(value.href || "").trim();

  if (!label || label.length > 100) {
    throw pageBuilderError(
      `${path}.label est obligatoire et limité à 100 caractères.`,
      "INVALID_BLOCK_CTA_LABEL",
      400,
      { path: `${path}.label` }
    );
  }

  return {
    label,
    href: validateUrl(href, `${path}.href`),
    ...(value.target === "_blank" ? { target: "_blank" } : {}),
  };
}

function validateValue(value, schema, path) {
  const nullable = schema.nullable === true;

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    if (nullable) return null;

    if (schema.required) {
      throw pageBuilderError(
        `${path} est obligatoire.`,
        "REQUIRED_BLOCK_FIELD",
        400,
        { path }
      );
    }

    if (schema.default !== undefined) {
      return deepClone(schema.default);
    }

    if (schema.type === "array") return [];
    if (schema.type === "boolean") return false;

    return value === undefined ? null : value;
  }

  switch (schema.type) {
    case "string":
    case "html": {
      const normalized = String(value).trim();

      if (
        schema.maxLength &&
        normalized.length > schema.maxLength
      ) {
        throw pageBuilderError(
          `${path} dépasse ${schema.maxLength} caractères.`,
          "BLOCK_FIELD_TOO_LONG",
          400,
          {
            path,
            maxLength: schema.maxLength,
            actualLength: normalized.length,
          }
        );
      }

      return normalized;
    }

    case "url":
      return validateUrl(value, path);

    case "boolean":
      if (typeof value !== "boolean") {
        throw pageBuilderError(
          `${path} doit être un booléen.`,
          "INVALID_BLOCK_BOOLEAN",
          400,
          { path }
        );
      }
      return value;

    case "number": {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        throw pageBuilderError(
          `${path} doit être un nombre.`,
          "INVALID_BLOCK_NUMBER",
          400,
          { path }
        );
      }

      if (schema.integer && !Number.isInteger(number)) {
        throw pageBuilderError(
          `${path} doit être un nombre entier.`,
          "INVALID_BLOCK_INTEGER",
          400,
          { path }
        );
      }

      if (schema.min !== undefined && number < schema.min) {
        throw pageBuilderError(
          `${path} doit être supérieur ou égal à ${schema.min}.`,
          "BLOCK_NUMBER_TOO_LOW",
          400,
          { path, min: schema.min }
        );
      }

      if (schema.max !== undefined && number > schema.max) {
        throw pageBuilderError(
          `${path} doit être inférieur ou égal à ${schema.max}.`,
          "BLOCK_NUMBER_TOO_HIGH",
          400,
          { path, max: schema.max }
        );
      }

      return number;
    }

    case "enum": {
      const normalized = String(value);

      if (!schema.values.includes(normalized)) {
        throw pageBuilderError(
          `${path} doit être l’une des valeurs suivantes : ${schema.values.join(", ")}.`,
          "INVALID_BLOCK_ENUM",
          400,
          { path, allowedValues: schema.values }
        );
      }

      return normalized;
    }

    case "cta":
      return validateCta(value, path, nullable);

    case "object": {
      if (!isPlainObject(value)) {
        throw pageBuilderError(
          `${path} doit être un objet.`,
          "INVALID_BLOCK_OBJECT",
          400,
          { path }
        );
      }

      return validateFields(value, schema.fields || {}, path);
    }

    case "array": {
      if (!Array.isArray(value)) {
        throw pageBuilderError(
          `${path} doit être un tableau.`,
          "INVALID_BLOCK_ARRAY",
          400,
          { path }
        );
      }

      if (
        schema.minItems !== undefined &&
        value.length < schema.minItems
      ) {
        throw pageBuilderError(
          `${path} doit contenir au moins ${schema.minItems} élément(s).`,
          "BLOCK_ARRAY_TOO_SHORT",
          400,
          { path, minItems: schema.minItems }
        );
      }

      if (
        schema.maxItems !== undefined &&
        value.length > schema.maxItems
      ) {
        throw pageBuilderError(
          `${path} ne peut pas dépasser ${schema.maxItems} élément(s).`,
          "BLOCK_ARRAY_TOO_LONG",
          400,
          { path, maxItems: schema.maxItems }
        );
      }

      return value.map((item, index) =>
        validateValue(
          item,
          schema.item || { type: "string" },
          `${path}[${index}]`
        )
      );
    }

    default:
      throw pageBuilderError(
        `Type de champ inconnu : ${schema.type}.`,
        "UNKNOWN_BLOCK_FIELD_TYPE",
        500,
        { path, type: schema.type }
      );
  }
}

function validateFields(input, fields, path = "content") {
  if (!isPlainObject(input)) {
    throw pageBuilderError(
      `${path} doit être un objet.`,
      "INVALID_BLOCK_CONTENT",
      400,
      { path }
    );
  }

  const normalized = {};

  for (const [name, schema] of Object.entries(fields)) {
    normalized[name] = validateValue(
      input[name],
      schema,
      `${path}.${name}`
    );
  }

  return normalized;
}

function normalizeBlockEnvelope(input = {}) {
  if (!isPlainObject(input)) {
    throw pageBuilderError(
      "Le bloc doit être un objet.",
      "INVALID_BLOCK",
      400
    );
  }

  const type = String(input.type || "").trim().toLowerCase();

  if (!type) {
    throw pageBuilderError(
      "Le type du bloc est obligatoire.",
      "BLOCK_TYPE_REQUIRED",
      400
    );
  }

  const status = String(input.status || "draft")
    .trim()
    .toLowerCase();

  if (!["draft", "published", "hidden"].includes(status)) {
    throw pageBuilderError(
      "Le statut du bloc doit être draft, published ou hidden.",
      "INVALID_BLOCK_STATUS",
      400
    );
  }

  const position = Number(input.position ?? 0);

  if (!Number.isInteger(position) || position < 0) {
    throw pageBuilderError(
      "La position du bloc doit être un entier positif.",
      "INVALID_BLOCK_POSITION",
      400
    );
  }

  return {
    ...(input.id ? { id: String(input.id) } : {}),
    type,
    status,
    position,
    content: input.content ?? {},
    settings: isPlainObject(input.settings)
      ? deepClone(input.settings)
      : {},
    seo: isPlainObject(input.seo)
      ? deepClone(input.seo)
      : {},
    visibleDesktop: input.visibleDesktop !== false,
    visibleMobile: input.visibleMobile !== false,
  };
}

module.exports = {
  deepClone,
  isPlainObject,
  normalizeBlockEnvelope,
  validateFields,
  validateValue,
};
