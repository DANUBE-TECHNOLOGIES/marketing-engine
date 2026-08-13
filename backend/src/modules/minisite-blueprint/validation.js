"use strict";

const {
  createBlueprintError,
} = require("./errors");

const {
  cleanText,
  slugify,
} = require("./utils");

const ALLOWED_BLUEPRINTS =
  new Set([
    "mondescale",
    "fram",
    "tui",
  ]);

function normalizeStringList(
  value,
  limit = 30
) {
  if (
    value === undefined ||
    value === null
  ) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw createBlueprintError(
      "La valeur doit être un tableau.",
      "BLUEPRINT_INVALID_LIST"
    );
  }

  return [
    ...new Set(
      value
        .map(
          (item) =>
            cleanText(item)
        )
        .filter(Boolean)
    ),
  ].slice(
    0,
    limit
  );
}

function validateAgencyContext(
  input = {}
) {
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input)
  ) {
    throw createBlueprintError(
      "Le contexte agence est invalide.",
      "BLUEPRINT_INVALID_CONTEXT"
    );
  }

  const agencyName =
    cleanText(
      input.agencyName ||
      input.name
    );

  if (!agencyName) {
    throw createBlueprintError(
      "agencyName est obligatoire.",
      "BLUEPRINT_AGENCY_NAME_REQUIRED"
    );
  }

  const city =
    cleanText(
      input.city
    );

  const blueprint =
    cleanText(
      input.blueprint ||
      input.brandType ||
      "mondescale"
    ).toLowerCase();

  if (
    !ALLOWED_BLUEPRINTS.has(
      blueprint
    )
  ) {
    throw createBlueprintError(
      `Blueprint inconnu : ${blueprint}.`,
      "BLUEPRINT_UNKNOWN",
      400,
      {
        allowed:
          [...ALLOWED_BLUEPRINTS],
      }
    );
  }

  const siteSlug =
    slugify(
      input.siteSlug ||
      agencyName
    );

  return {
    agencyId:
      cleanText(
        input.agencyId
      ) || null,

    agencyName,

    city,

    blueprint,

    siteSlug,

    phone:
      cleanText(
        input.phone
      ),

    email:
      cleanText(
        input.email
      ),

    address:
      cleanText(
        input.address
      ),

    postalCode:
      cleanText(
        input.postalCode
      ),

    description:
      cleanText(
        input.description
      ),

    specialties:
      normalizeStringList(
        input.specialties,
        20
      ),

    destinations:
      normalizeStringList(
        input.destinations,
        30
      ),

    partners:
      normalizeStringList(
        input.partners,
        20
      ),

    services:
      normalizeStringList(
        input.services,
        20
      ),

    teamMembers:
      Array.isArray(
        input.teamMembers
      )
        ? input.teamMembers
            .filter(
              (member) =>
                member &&
                typeof member ===
                  "object"
            )
            .slice(
              0,
              20
            )
            .map(
              (member) => ({
                name:
                  cleanText(
                    member.name
                  ),

                role:
                  cleanText(
                    member.role
                  ),

                description:
                  cleanText(
                    member.description
                  ),

                imageAssetId:
                  cleanText(
                    member.imageAssetId
                  ),

                imageUrl:
                  cleanText(
                    member.imageUrl
                  ),

                imageAlt:
                  cleanText(
                    member.imageAlt
                  ),
              })
            )
            .filter(
              (member) =>
                member.name
            )
        : [],
  };
}

function validateBlueprintDefinition(
  definition
) {
  if (
    !definition ||
    typeof definition !==
      "object"
  ) {
    throw createBlueprintError(
      "Définition de blueprint invalide.",
      "BLUEPRINT_DEFINITION_INVALID",
      500
    );
  }

  if (
    !cleanText(
      definition.id
    )
  ) {
    throw createBlueprintError(
      "Le blueprint doit posséder un identifiant.",
      "BLUEPRINT_ID_REQUIRED",
      500
    );
  }

  if (
    !cleanText(
      definition.version
    )
  ) {
    throw createBlueprintError(
      "Le blueprint doit posséder une version.",
      "BLUEPRINT_VERSION_REQUIRED",
      500
    );
  }

  if (
    !Array.isArray(
      definition.pages
    ) ||
    !definition.pages.length
  ) {
    throw createBlueprintError(
      "Le blueprint doit définir des pages.",
      "BLUEPRINT_PAGES_REQUIRED",
      500
    );
  }

  const slugs =
    definition.pages.map(
      (page) =>
        cleanText(
          page.slug
        )
    );

  if (
    new Set(slugs).size !==
    slugs.length
  ) {
    throw createBlueprintError(
      "Le blueprint contient des slugs de pages dupliqués.",
      "BLUEPRINT_DUPLICATE_PAGE_SLUG",
      500
    );
  }

  return definition;
}

module.exports = {
  ALLOWED_BLUEPRINTS,
  normalizeStringList,
  validateAgencyContext,
  validateBlueprintDefinition,
};
