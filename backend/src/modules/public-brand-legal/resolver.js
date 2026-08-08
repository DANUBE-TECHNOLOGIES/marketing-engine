"use strict";

const {
  publicBrandLegalError,
} = require("./errors");

const BRAND_ASSET_RELATIONS =
  Object.freeze({
    logoPrimary:
      "logoPrimaryId",

    logoLight:
      "logoLightId",

    logoDark:
      "logoDarkId",

    favicon:
      "faviconId",

    heroDefault:
      "heroDefaultId",

    openGraph:
      "openGraphId",
  });

const BRAND_RESOLVABLE_FIELDS =
  Object.freeze([
    "name",
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "textColor",
    "headingFont",
    "bodyFont",
    "buttonRadius",
    "facebookUrl",
    "instagramUrl",
    "linkedinUrl",
    "youtubeUrl",
    "defaultSeoTitle",
    "defaultSeoDescription",
    "customCss",
    "settings",
  ]);

const LEGAL_RESOLVABLE_FIELDS =
  Object.freeze([
    "name",
    "legalName",
    "legalForm",
    "shareCapital",
    "registeredOffice",
    "registrationNumber",
    "vatNumber",
    "travelRegistration",
    "financialGuarantee",
    "professionalInsurance",
    "publicationDirector",
    "hostingProvider",
    "hostingAddress",
    "hostingPhone",
    "dataController",
    "privacyContactEmail",
    "dataProtectionOfficer",
    "mediatorName",
    "mediatorAddress",
    "mediatorWebsite",
    "legalNoticeContent",
    "privacyPolicyContent",
    "cookiePolicyContent",
    "termsContent",
    "effectiveDate",
    "settings",
  ]);

function mergeDefinedFields({
  shared,
  override,
  fields,
}) {
  const result = {};

  for (
    const field
    of fields
  ) {
    const overrideValue =
      override?.[field];

    const sharedValue =
      shared?.[field];

    if (
      overrideValue !==
        undefined &&
      overrideValue !==
        null
    ) {
      result[field] =
        overrideValue;

      continue;
    }

    if (
      sharedValue !==
        undefined
    ) {
      result[field] =
        sharedValue;
    }
  }

  return result;
}

function normalizePublicAsset(
  asset
) {
  if (!asset) {
    return null;
  }

  return {
    id:
      asset.id,

    kind:
      asset.kind,

    publicUrl:
      asset.publicUrl,

    mimeType:
      asset.mimeType,

    width:
      asset.width,

    height:
      asset.height,

    altText:
      asset.altText,

    title:
      asset.title,

    description:
      asset.description,

    originalName:
      asset.originalName,
  };
}

function resolveAsset({
  shared,
  override,
  relation,
}) {
  const foreignKey =
    BRAND_ASSET_RELATIONS[
      relation
    ];

  if (!foreignKey) {
    return null;
  }

  if (
    override?.[foreignKey]
  ) {
    return normalizePublicAsset(
      override[relation]
    );
  }

  if (
    shared?.[foreignKey]
  ) {
    return normalizePublicAsset(
      shared[relation]
    );
  }

  return null;
}

function buildCssVariables(
  brand
) {
  const variables = {};

  const mappings = {
    primaryColor:
      "--brand-primary",

    secondaryColor:
      "--brand-secondary",

    accentColor:
      "--brand-accent",

    backgroundColor:
      "--brand-background",

    textColor:
      "--brand-text",

    headingFont:
      "--brand-heading-font",

    bodyFont:
      "--brand-body-font",

    buttonRadius:
      "--brand-button-radius",
  };

  for (
    const [
      field,
      variable,
    ]
    of Object.entries(
      mappings
    )
  ) {
    const value =
      brand?.[field];

    if (
      value ===
        undefined ||
      value ===
        null ||
      value ===
        ""
    ) {
      continue;
    }

    variables[variable] =
      field ===
        "buttonRadius"
        ? `${value}px`
        : String(value);
  }

  return variables;
}

function buildCssText(
  variables
) {
  return Object.entries(
    variables || {}
  )
    .map(
      ([
        key,
        value,
      ]) =>
        `${key}: ${value};`
    )
    .join(" ");
}

function buildMetadata({
  brand,
  assets,
  agency,
}) {
  const title =
    brand
      ?.defaultSeoTitle ||
    agency
      ?.name ||
    null;

  const description =
    brand
      ?.defaultSeoDescription ||
    null;

  return {
    title,

    description,

    icons:
      assets.favicon
        ? {
            icon:
              assets.favicon
                .publicUrl,
          }
        : null,

    openGraph:
      assets.openGraph
        ? {
            title,

            description,

            images: [
              {
                url:
                  assets.openGraph
                    .publicUrl,

                width:
                  assets.openGraph
                    .width ||
                  undefined,

                height:
                  assets.openGraph
                    .height ||
                  undefined,

                alt:
                  assets.openGraph
                    .altText ||
                  title ||
                  undefined,
              },
            ],
          }
        : {
            title,

            description,

            images:
              [],
          },
  };
}

class PublicBrandLegalResolver {
  constructor({
    prisma,
  } = {}) {
    if (!prisma) {
      throw publicBrandLegalError(
        "PUBLIC_BRAND_LEGAL_PRISMA_REQUIRED",
        "Le client Prisma est obligatoire.",
        {},
        500
      );
    }

    this.prisma =
      prisma;
  }

  brandInclude() {
    return {
      logoPrimary:
        true,

      logoLight:
        true,

      logoDark:
        true,

      favicon:
        true,

      heroDefault:
        true,

      openGraph:
        true,
    };
  }

  async resolveAgency({
    agencyId,
    tenantId,
  }) {
    const normalizedAgencyId =
      Number(
        agencyId
      );

    if (
      !Number.isInteger(
        normalizedAgencyId
      )
    ) {
      throw publicBrandLegalError(
        "PUBLIC_BRAND_LEGAL_AGENCY_ID_INVALID",
        "L’identifiant agence doit être un entier.",
        {
          agencyId,
        }
      );
    }

    const agency =
      await this.prisma
        .agency
        .findFirst({
          where: {
            id:
              normalizedAgencyId,

            tenantId:
              tenantId ||
              undefined,
          },

          select: {
            id:
              true,

            name:
              true,

            tenantId:
              true,
          },
        });

    if (!agency) {
      throw publicBrandLegalError(
        "PUBLIC_BRAND_LEGAL_AGENCY_NOT_FOUND",
        "L’agence est introuvable.",
        {
          agencyId:
            normalizedAgencyId,

          tenantId:
            tenantId ||
            null,
        },
        404
      );
    }

    return agency;
  }

  async loadBrandProfiles({
    tenantId,
    agencyId,
  }) {
    const profiles =
      await this.prisma
        .brandProfile
        .findMany({
          where: {
            tenantId,

            OR: [
              {
                agencyId:
                  null,
              },

              {
                agencyId,
              },
            ],
          },

          include:
            this.brandInclude(),
        });

    return {
      shared:
        profiles.find(
          (profile) =>
            profile.agencyId ===
            null
        ) ||
        null,

      override:
        profiles.find(
          (profile) =>
            profile.agencyId ===
            agencyId
        ) ||
        null,
    };
  }

  async loadLegalProfiles({
    tenantId,
    agencyId,
  }) {
    const profiles =
      await this.prisma
        .legalProfile
        .findMany({
          where: {
            tenantId,

            OR: [
              {
                agencyId:
                  null,
              },

              {
                agencyId,
              },
            ],
          },
        });

    return {
      shared:
        profiles.find(
          (profile) =>
            profile.agencyId ===
            null
        ) ||
        null,

      override:
        profiles.find(
          (profile) =>
            profile.agencyId ===
            agencyId
        ) ||
        null,
    };
  }

  resolveBrand({
    shared,
    override,
  }) {
    const resolved =
      mergeDefinedFields({
        shared,
        override,

        fields:
          BRAND_RESOLVABLE_FIELDS,
      });

    const assets = {
      logoPrimary:
        resolveAsset({
          shared,
          override,

          relation:
            "logoPrimary",
        }),

      logoLight:
        resolveAsset({
          shared,
          override,

          relation:
            "logoLight",
        }),

      logoDark:
        resolveAsset({
          shared,
          override,

          relation:
            "logoDark",
        }),

      favicon:
        resolveAsset({
          shared,
          override,

          relation:
            "favicon",
        }),

      heroDefault:
        resolveAsset({
          shared,
          override,

          relation:
            "heroDefault",
        }),

      openGraph:
        resolveAsset({
          shared,
          override,

          relation:
            "openGraph",
        }),
    };

    const cssVariables =
      buildCssVariables(
        resolved
      );

    return {
      inherited:
        Boolean(shared),

      hasOverride:
        Boolean(override),

      sharedProfileId:
        shared?.id ||
        null,

      overrideProfileId:
        override?.id ||
        null,

      values:
        resolved,

      assets,

      cssVariables,

      cssText:
        buildCssText(
          cssVariables
        ),
    };
  }

  resolveLegal({
    shared,
    override,
  }) {
    const resolved =
      mergeDefinedFields({
        shared,
        override,

        fields:
          LEGAL_RESOLVABLE_FIELDS,
      });

    return {
      inherited:
        Boolean(shared),

      hasOverride:
        Boolean(override),

      sharedProfileId:
        shared?.id ||
        null,

      overrideProfileId:
        override?.id ||
        null,

      values:
        resolved,

      pages: {
        legalNotice:
          resolved
            .legalNoticeContent ||
          null,

        privacyPolicy:
          resolved
            .privacyPolicyContent ||
          null,

        cookiePolicy:
          resolved
            .cookiePolicyContent ||
          null,

        terms:
          resolved
            .termsContent ||
          null,
      },
    };
  }

  async resolve({
    agencyId,
    tenantId,
  }) {
    const agency =
      await this.resolveAgency({
        agencyId,

        tenantId,
      });

    const [
      brandProfiles,
      legalProfiles,
    ] =
      await Promise.all([
        this.loadBrandProfiles({
          tenantId:
            agency.tenantId,

          agencyId:
            agency.id,
        }),

        this.loadLegalProfiles({
          tenantId:
            agency.tenantId,

          agencyId:
            agency.id,
        }),
      ]);

    const brand =
      this.resolveBrand(
        brandProfiles
      );

    const legal =
      this.resolveLegal(
        legalProfiles
      );

    const metadata =
      buildMetadata({
        brand:
          brand.values,

        assets:
          brand.assets,

        agency,
      });

    return {
      version:
        "1.0",

      resolvedAt:
        new Date()
          .toISOString(),

      agency,

      brand,

      legal,

      metadata,

      capabilities: {
        cssVariables:
          true,

        logoAssets:
          true,

        favicon:
          true,

        openGraph:
          true,

        legalPages:
          true,

        tenantInheritance:
          true,

        agencyOverride:
          true,
      },
    };
  }
}

module.exports = {
  PublicBrandLegalResolver,

  BRAND_ASSET_RELATIONS,
  BRAND_RESOLVABLE_FIELDS,
  LEGAL_RESOLVABLE_FIELDS,

  mergeDefinedFields,
  normalizePublicAsset,
  resolveAsset,
  buildCssVariables,
  buildCssText,
  buildMetadata,
};
