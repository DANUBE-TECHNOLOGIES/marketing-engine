"use strict";

const {
  brandProfileError,
} = require("./errors");

const ASSET_FIELDS =
  Object.freeze({
    logoPrimaryId:
      "logo-primary",

    logoLightId:
      "logo-light",

    logoDarkId:
      "logo-dark",

    faviconId:
      "favicon",

    heroDefaultId:
      "hero",

    openGraphId:
      "open-graph",
  });

const COLOR_FIELDS =
  Object.freeze([
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "backgroundColor",
    "textColor",
  ]);

const TEXT_FIELDS =
  Object.freeze([
    "name",
    "headingFont",
    "bodyFont",
    "facebookUrl",
    "instagramUrl",
    "linkedinUrl",
    "youtubeUrl",
    "defaultSeoTitle",
    "defaultSeoDescription",
    "customCss",
  ]);

function normalizeAgencyId(
  value
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isInteger(parsed)
  ) {
    throw brandProfileError(
      "BRAND_PROFILE_AGENCY_ID_INVALID",
      "L’identifiant de l’agence doit être un entier.",
      {
        agencyId:
          value,
      }
    );
  }

  return parsed;
}

function normalizeOptionalText(
  value
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
}

function normalizeColor(
  value,
  field
) {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    value === null ||
    value === ""
  ) {
    return null;
  }

  const normalized =
    String(value)
      .trim()
      .toUpperCase();

  if (
    !/^#[0-9A-F]{6}$/.test(
      normalized
    )
  ) {
    throw brandProfileError(
      "BRAND_PROFILE_COLOR_INVALID",
      `${field} doit être une couleur hexadécimale au format #RRGGBB.`,
      {
        field,
        value,
      }
    );
  }

  return normalized;
}

function mergeDefined(
  inherited,
  override
) {
  const result = {
    ...(inherited || {}),
  };

  for (
    const [
      key,
      value,
    ]
    of Object.entries(
      override || {}
    )
  ) {
    if (
      value !== null &&
      value !== undefined
    ) {
      result[key] =
        value;
    }
  }

  return result;
}

class BrandProfileService {
  constructor({
    prisma,
  } = {}) {
    if (!prisma) {
      throw brandProfileError(
        "BRAND_PROFILE_PRISMA_REQUIRED",
        "Le client Prisma est obligatoire.",
        {},
        500
      );
    }

    this.prisma =
      prisma;
  }

  async assertScope({
    tenantId,
    agencyId,
  }) {
    const tenant =
      await this.prisma
        .tenant
        .findUnique({
          where: {
            id:
              tenantId,
          },

          select: {
            id:
              true,
          },
        });

    if (!tenant) {
      throw brandProfileError(
        "BRAND_PROFILE_TENANT_NOT_FOUND",
        "La société est introuvable.",
        {
          tenantId,
        },
        404
      );
    }

    if (
      agencyId === null
    ) {
      return;
    }

    const agency =
      await this.prisma
        .agency
        .findFirst({
          where: {
            id:
              agencyId,

            tenantId,
          },

          select: {
            id:
              true,
          },
        });

    if (!agency) {
      throw brandProfileError(
        "BRAND_PROFILE_AGENCY_NOT_FOUND",
        "L’agence est introuvable pour cette société.",
        {
          tenantId,
          agencyId,
        },
        404
      );
    }
  }

  profileInclude() {
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

  async validateAssets({
    tenantId,
    agencyId,
    data,
  }) {
    for (
      const [
        field,
        expectedKind,
      ]
      of Object.entries(
        ASSET_FIELDS
      )
    ) {
      if (
        data[field] ===
        undefined ||
        data[field] ===
        null
      ) {
        continue;
      }

      const asset =
        await this.prisma
          .brandAsset
          .findFirst({
            where: {
              id:
                data[field],

              tenantId,

              status:
                "ready",
            },

            select: {
              id:
                true,

              agencyId:
                true,

              kind:
                true,
            },
          });

      if (!asset) {
        throw brandProfileError(
          "BRAND_PROFILE_ASSET_NOT_FOUND",
          `Le média affecté à ${field} est introuvable.`,
          {
            field,
            assetId:
              data[field],
          },
          404
        );
      }

      if (
        asset.kind !==
        expectedKind
      ) {
        throw brandProfileError(
          "BRAND_PROFILE_ASSET_KIND_MISMATCH",
          `Le média ${field} doit être de type ${expectedKind}.`,
          {
            field,
            assetId:
              asset.id,

            expectedKind,

            actualKind:
              asset.kind,
          }
        );
      }

      if (
        agencyId === null &&
        asset.agencyId !==
          null
      ) {
        throw brandProfileError(
          "BRAND_PROFILE_SHARED_ASSET_SCOPE_INVALID",
          "Un profil société ne peut pas utiliser un média propre à une agence.",
          {
            field,
            assetId:
              asset.id,

            assetAgencyId:
              asset.agencyId,
          }
        );
      }

      if (
        agencyId !== null &&
        asset.agencyId !==
          null &&
        asset.agencyId !==
          agencyId
      ) {
        throw brandProfileError(
          "BRAND_PROFILE_ASSET_AGENCY_MISMATCH",
          "Le média appartient à une autre agence.",
          {
            field,
            assetId:
              asset.id,

            expectedAgencyId:
              agencyId,

            assetAgencyId:
              asset.agencyId,
          }
        );
      }
    }
  }

  normalizeInput(
    input
  ) {
    const data = {};

    for (
      const field
      of COLOR_FIELDS
    ) {
      const normalized =
        normalizeColor(
          input[field],
          field
        );

      if (
        normalized !==
        undefined
      ) {
        data[field] =
          normalized;
      }
    }

    for (
      const field
      of TEXT_FIELDS
    ) {
      const normalized =
        normalizeOptionalText(
          input[field]
        );

      if (
        normalized !==
        undefined
      ) {
        data[field] =
          normalized;
      }
    }

    for (
      const field
      of Object.keys(
        ASSET_FIELDS
      )
    ) {
      if (
        input[field] !==
        undefined
      ) {
        data[field] =
          input[field] ||
          null;
      }
    }

    if (
      input.buttonRadius !==
      undefined
    ) {
      const radius =
        Number(
          input.buttonRadius
        );

      if (
        !Number.isInteger(radius) ||
        radius < 0 ||
        radius > 100
      ) {
        throw brandProfileError(
          "BRAND_PROFILE_RADIUS_INVALID",
          "buttonRadius doit être un entier compris entre 0 et 100.",
          {
            value:
              input.buttonRadius,
          }
        );
      }

      data.buttonRadius =
        radius;
    }

    if (
      input.settings !==
      undefined
    ) {
      if (
        !input.settings ||
        typeof input.settings !==
          "object" ||
        Array.isArray(
          input.settings
        )
      ) {
        throw brandProfileError(
          "BRAND_PROFILE_SETTINGS_INVALID",
          "settings doit être un objet JSON."
        );
      }

      data.settings =
        input.settings;
    }

    if (
      input.isDefault !==
      undefined
    ) {
      data.isDefault =
        Boolean(
          input.isDefault
        );
    }

    return data;
  }

  async getRaw({
    tenantId,
    agencyId,
  }) {
    return this.prisma
      .brandProfile
      .findFirst({
        where: {
          tenantId,

          agencyId,
        },

        include:
          this.profileInclude(),
      });
  }

  async getResolved({
    tenantId,
    agencyId,
  }) {
    await this.assertScope({
      tenantId,
      agencyId,
    });

    const shared =
      await this.getRaw({
        tenantId,

        agencyId:
          null,
      });

    if (
      agencyId === null
    ) {
      return {
        scope:
          "tenant",

        inherited:
          false,

        shared,

        override:
          null,

        resolved:
          shared,
      };
    }

    const override =
      await this.getRaw({
        tenantId,

        agencyId,
      });

    if (
      !shared &&
      !override
    ) {
      return {
        scope:
          "agency",

        inherited:
          false,

        shared:
          null,

        override:
          null,

        resolved:
          null,
      };
    }

    const resolved =
      mergeDefined(
        shared,
        override
      );

    return {
      scope:
        "agency",

      inherited:
        Boolean(
          shared
        ),

      shared,

      override,

      resolved,
    };
  }

  async save({
    tenantId,
    agencyId,
    input,
  }) {
    await this.assertScope({
      tenantId,
      agencyId,
    });

    const data =
      this.normalizeInput(
        input || {}
      );

    await this.validateAssets({
      tenantId,
      agencyId,
      data,
    });

    const name =
      data.name ||
      (
        agencyId === null
          ? "Identité société"
          : `Identité agence ${agencyId}`
      );

    const existing =
      await this.prisma
        .brandProfile
        .findFirst({
          where: {
            tenantId,
            agencyId,
          },

          select: {
            id:
              true,
          },
        });

    if (existing) {
      return this.prisma
        .brandProfile
        .update({
          where: {
            id:
              existing.id,
          },

          data: {
            ...data,

            name,
          },

          include:
            this.profileInclude(),
        });
    }

    return this.prisma
      .brandProfile
      .create({
        data: {
          tenantId,
          agencyId,
          name,
          ...data,
        },

        include:
          this.profileInclude(),
      });
  }

  async removeOverride({
    tenantId,
    agencyId,
  }) {
    if (
      agencyId === null
    ) {
      throw brandProfileError(
        "BRAND_PROFILE_SHARED_DELETE_FORBIDDEN",
        "Le profil société ne peut pas être supprimé par cette route."
      );
    }

    const existing =
      await this.prisma
        .brandProfile
        .findFirst({
          where: {
            tenantId,
            agencyId,
          },

          select: {
            id:
              true,
          },
        });

    if (!existing) {
      return {
        deleted:
          false,
      };
    }

    await this.prisma
      .brandProfile
      .delete({
        where: {
          id:
            existing.id,
        },
      });

    return {
      deleted:
        true,

      id:
        existing.id,
    };
  }
}

module.exports = {
  BrandProfileService,
  ASSET_FIELDS,
  COLOR_FIELDS,
  TEXT_FIELDS,
  normalizeAgencyId,
  normalizeOptionalText,
  normalizeColor,
  mergeDefined,
};
