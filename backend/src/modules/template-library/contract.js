"use strict";

const {
  TEMPLATE_KINDS,
  TEMPLATE_STATUS,
  TEMPLATE_SCOPES,
  PAGE_TYPES,
} =
  require(
    "./constants"
  );

function normalizeTemplateId(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9._-]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

function normalizePageType(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toUpperCase();
}

function validateTemplateDefinition(
  definition
) {
  const errors =
    [];

  if (
    !definition ||
    typeof definition !==
      "object"
  ) {
    return {
      valid:
        false,

      errors: [
        "TEMPLATE_DEFINITION_REQUIRED",
      ],
    };
  }

  const id =
    normalizeTemplateId(
      definition.id
    );

  if (!id) {
    errors.push(
      "TEMPLATE_ID_REQUIRED"
    );
  }

  if (
    definition.kind !==
    TEMPLATE_KINDS.PAGE
  ) {
    errors.push(
      "TEMPLATE_KIND_INVALID"
    );
  }

  const pageType =
    normalizePageType(
      definition.pageType
    );

  if (
    !PAGE_TYPES.includes(
      pageType
    )
  ) {
    errors.push(
      "TEMPLATE_PAGE_TYPE_INVALID"
    );
  }

  if (
    !definition.version ||
    typeof definition.version !==
      "string"
  ) {
    errors.push(
      "TEMPLATE_VERSION_REQUIRED"
    );
  }

  if (
    !Object.values(
      TEMPLATE_STATUS
    ).includes(
      definition.status
    )
  ) {
    errors.push(
      "TEMPLATE_STATUS_INVALID"
    );
  }

  if (
    !Object.values(
      TEMPLATE_SCOPES
    ).includes(
      definition.scope
    )
  ) {
    errors.push(
      "TEMPLATE_SCOPE_INVALID"
    );
  }

  if (
    !Array.isArray(
      definition.sections
    )
  ) {
    errors.push(
      "TEMPLATE_SECTIONS_REQUIRED"
    );
  }

  return {
    valid:
      errors.length ===
      0,

    errors,

    normalized: {
      ...definition,

      id,

      pageType,
    },
  };
}

function assertTemplateDefinition(
  definition
) {
  const result =
    validateTemplateDefinition(
      definition
    );

  if (!result.valid) {
    const error =
      new Error(
        `Template invalide : ${result.errors.join(", ")}`
      );

    error.code =
      "INVALID_TEMPLATE_DEFINITION";

    error.statusCode =
      400;

    error.validationErrors =
      result.errors;

    throw error;
  }

  return result.normalized;
}

module.exports = {
  normalizeTemplateId,
  normalizePageType,
  validateTemplateDefinition,
  assertTemplateDefinition,
};
