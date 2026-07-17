const {
  ValidationError
} = require("../../core/errors");

function requireText(value, field) {
  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    throw new ValidationError(
      `Le champ ${field} est obligatoire.`,
      {
        field
      }
    );
  }

  return value.trim();
}

function optionalText(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    throw new ValidationError(
      "La valeur doit être une chaîne de caractères."
    );
  }

  return value.trim();
}

function parsePositiveInteger(value, field) {
  const parsed = Number(value);

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new ValidationError(
      `Le champ ${field} doit être un entier positif.`,
      {
        field
      }
    );
  }

  return parsed;
}

function validateSiteCreation(body = {}) {
  return {
    agencyId: parsePositiveInteger(
      body.agencyId,
      "agencyId"
    ),
    name: requireText(
      body.name,
      "name"
    ),
    slug: requireText(
      body.slug,
      "slug"
    ),
    seoCity: requireText(
      body.seoCity,
      "seoCity"
    ),
    domain: optionalText(
      body.domain
    ),
    subdomain: optionalText(
      body.subdomain
    ),
    targetCities:
      body.targetCities ?? null,
    status:
      optionalText(body.status) ||
      "draft",
    theme:
      body.theme ?? null,
    metadata:
      body.metadata ?? null
  };
}

function validatePageCreation(body = {}) {
  return {
    siteId: requireText(
      body.siteId,
      "siteId"
    ),
    knowledgeEntityId:
      optionalText(
        body.knowledgeEntityId
      ),
    slug: requireText(
      body.slug,
      "slug"
    ),
    title: requireText(
      body.title,
      "title"
    ),
    pageType:
      optionalText(body.pageType) ||
      "destination",
    localCity:
      optionalText(body.localCity),
    seoTitle:
      optionalText(body.seoTitle),
    seoDescription:
      optionalText(
        body.seoDescription
      ),
    introduction:
      optionalText(body.introduction),
    content:
      body.content ?? null,
    callToAction:
      body.callToAction ?? null,
    status:
      optionalText(body.status) ||
      "draft"
  };
}

module.exports = {
  validateSiteCreation,
  validatePageCreation
};
