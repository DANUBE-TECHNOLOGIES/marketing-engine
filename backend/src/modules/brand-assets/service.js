"use strict";

const crypto =
  require("node:crypto");

const path =
  require("node:path");

const {
  brandAssetError,
} = require("./errors");

const {
  validateFileSignature,
} = require("./file-signatures");

const {
  extractImageDimensions,
} = require("./image-dimensions");

const {
  LocalBrandAssetStorage,
} = require("./storage");

const DEFAULT_MAX_FILE_SIZE =
  10 * 1024 * 1024;

const ALLOWED_KINDS =
  Object.freeze([
    "logo-primary",
    "logo-light",
    "logo-dark",
    "favicon",
    "hero",
    "cover",
    "open-graph",
    "gallery",
    "document",
  ]);

function sanitizeOriginalName(
  value
) {
  const base =
    path.basename(
      String(
        value ||
        "asset"
      )
    );

  return base
    .replace(
      /[\u0000-\u001f\u007f]/g,
      ""
    )
    .slice(
      0,
      255
    );
}

function normalizeOptionalText(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized =
    String(value).trim();

  return normalized || null;
}

class BrandAssetService {
  constructor({
    prisma,
    storage,
    maxFileSize,
  } = {}) {
    if (!prisma) {
      throw brandAssetError(
        "BRAND_ASSET_PRISMA_REQUIRED",
        "Le client Prisma est obligatoire.",
        {},
        500
      );
    }

    this.prisma =
      prisma;

    this.storage =
      storage ||
      new LocalBrandAssetStorage({
        rootDirectory:
          process.env
            .BRAND_ASSET_STORAGE_ROOT,

        publicBasePath:
          process.env
            .BRAND_ASSET_PUBLIC_BASE_PATH ||
          "/media/brand-assets",
      });

    const configuredSize =
      Number(
        maxFileSize ||
        process.env
          .BRAND_ASSET_MAX_FILE_SIZE ||
        DEFAULT_MAX_FILE_SIZE
      );

    this.maxFileSize =
      Number.isFinite(
        configuredSize
      ) &&
      configuredSize > 0
        ? configuredSize
        : DEFAULT_MAX_FILE_SIZE;
  }

  validateKind(
    kind
  ) {
    const normalized =
      String(
        kind || ""
      )
        .trim()
        .toLowerCase();

    if (
      !ALLOWED_KINDS.includes(
        normalized
      )
    ) {
      throw brandAssetError(
        "BRAND_ASSET_KIND_INVALID",
        `Le type de média ${normalized || "vide"} n’est pas autorisé.`,
        {
          allowedKinds:
            ALLOWED_KINDS,
        }
      );
    }

    return normalized;
  }

  validateBuffer(
    buffer
  ) {
    if (
      !Buffer.isBuffer(
        buffer
      )
    ) {
      throw brandAssetError(
        "BRAND_ASSET_BUFFER_REQUIRED",
        "Le fichier est obligatoire."
      );
    }

    if (!buffer.length) {
      throw brandAssetError(
        "BRAND_ASSET_EMPTY_FILE",
        "Le fichier est vide."
      );
    }

    if (
      buffer.length >
      this.maxFileSize
    ) {
      throw brandAssetError(
        "BRAND_ASSET_FILE_TOO_LARGE",
        "Le fichier dépasse la taille maximale autorisée.",
        {
          sizeBytes:
            buffer.length,

          maxFileSize:
            this.maxFileSize,
        },
        413
      );
    }
  }

  async assertOwnership({
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
      throw brandAssetError(
        "BRAND_ASSET_TENANT_NOT_FOUND",
        "La société demandée est introuvable.",
        {
          tenantId,
        },
        404
      );
    }

    if (
      agencyId === null ||
      agencyId === undefined
    ) {
      return;
    }

    const normalizedAgencyId =
      Number(
        agencyId
      );

    if (
      !Number.isInteger(
        normalizedAgencyId
      )
    ) {
      throw brandAssetError(
        "BRAND_ASSET_AGENCY_ID_INVALID",
        "L’identifiant de l’agence doit être un entier.",
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

            tenantId,
          },

          select: {
            id:
              true,
          },
        });

    if (!agency) {
      throw brandAssetError(
        "BRAND_ASSET_AGENCY_NOT_FOUND",
        "L’agence demandée est introuvable pour cette société.",
        {
          tenantId,

          agencyId:
            normalizedAgencyId,
        },
        404
      );
    }
  }

  async create({
    tenantId,
    agencyId = null,
    kind,
    originalName,
    declaredMimeType,
    buffer,
    altText = null,
    title = null,
    description = null,
    metadata = {},
  }) {
    const normalizedTenantId =
      String(
        tenantId || ""
      ).trim();

    if (!normalizedTenantId) {
      throw brandAssetError(
        "BRAND_ASSET_TENANT_REQUIRED",
        "La société est obligatoire."
      );
    }

    this.validateBuffer(
      buffer
    );

    const normalizedKind =
      this.validateKind(
        kind
      );

    const normalizedAgencyId =
      agencyId === null ||
      agencyId === undefined ||
      agencyId === ""
        ? null
        : Number(
            agencyId
          );

    await this.assertOwnership({
      tenantId:
        normalizedTenantId,

      agencyId:
        normalizedAgencyId,
    });

    const signature =
      validateFileSignature({
        buffer,

        declaredMimeType,
      });

    const dimensions =
      extractImageDimensions(
        buffer,
        signature.mimeType
      );

    const checksum =
      crypto
        .createHash(
          "sha256"
        )
        .update(
          buffer
        )
        .digest(
          "hex"
        );

    const storageKey =
      this.storage
        .buildStorageKey({
          tenantId:
            normalizedTenantId,

          agencyId:
            normalizedAgencyId,

          kind:
            normalizedKind,

          extension:
            signature.extension,
        });

    const stored =
      await this.storage.write({
        storageKey,

        buffer,
      });

    try {
      return await this.prisma
        .brandAsset
        .create({
          data: {
            tenantId:
              normalizedTenantId,

            agencyId:
              normalizedAgencyId,

            kind:
              normalizedKind,

            originalName:
              sanitizeOriginalName(
                originalName
              ),

            storageKey:
              stored.storageKey,

            publicUrl:
              stored.publicUrl,

            mimeType:
              signature.mimeType,

            extension:
              signature.extension,

            sizeBytes:
              buffer.length,

            width:
              dimensions?.width ??
              null,

            height:
              dimensions?.height ??
              null,

            checksum,

            altText:
              normalizeOptionalText(
                altText
              ),

            title:
              normalizeOptionalText(
                title
              ),

            description:
              normalizeOptionalText(
                description
              ),

            metadata:
              metadata &&
              typeof metadata ===
                "object" &&
              !Array.isArray(
                metadata
              )
                ? metadata
                : {},

            status:
              "ready",
          },
        });
    } catch (error) {
      await this.storage
        .remove(
          stored.storageKey
        )
        .catch(
          () => {}
        );

      throw error;
    }
  }

  async list({
    tenantId,
    agencyId,
    kind,
    status = "ready",
    limit = 100,
  }) {
    const normalizedLimit =
      Math.min(
        200,
        Math.max(
          1,
          Number(limit) ||
          100
        )
      );

    return this.prisma
      .brandAsset
      .findMany({
        where: {
          tenantId,

          agencyId:
            agencyId ===
              undefined
              ? undefined
              : agencyId ===
                  null ||
                agencyId ===
                  ""
                ? null
                : Number(
                    agencyId
                  ),

          kind:
            kind ||
            undefined,

          status:
            status ||
            undefined,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        take:
          normalizedLimit,
      });
  }

  async findOne({
    id,
    tenantId,
  }) {
    const asset =
      await this.prisma
        .brandAsset
        .findFirst({
          where: {
            id,

            tenantId,
          },
        });

    if (!asset) {
      throw brandAssetError(
        "BRAND_ASSET_NOT_FOUND",
        "Le média est introuvable.",
        {
          id,
        },
        404
      );
    }

    return asset;
  }

  async clearBrandProfileReferences({
    transaction,
    tenantId,
    assetId,
  }) {
    const profiles =
      await transaction
        .brandProfile
        .findMany({
          where: {
            tenantId,

            OR: [
              {
                logoPrimaryId:
                  assetId,
              },
              {
                logoLightId:
                  assetId,
              },
              {
                logoDarkId:
                  assetId,
              },
              {
                faviconId:
                  assetId,
              },
              {
                heroDefaultId:
                  assetId,
              },
              {
                openGraphId:
                  assetId,
              },
            ],
          },

          select: {
            id:
              true,

            logoPrimaryId:
              true,

            logoLightId:
              true,

            logoDarkId:
              true,

            faviconId:
              true,

            heroDefaultId:
              true,

            openGraphId:
              true,
          },
        });

    for (
      const profile
      of profiles
    ) {
      const data = {};

      if (
        profile.logoPrimaryId ===
        assetId
      ) {
        data.logoPrimaryId =
          null;
      }

      if (
        profile.logoLightId ===
        assetId
      ) {
        data.logoLightId =
          null;
      }

      if (
        profile.logoDarkId ===
        assetId
      ) {
        data.logoDarkId =
          null;
      }

      if (
        profile.faviconId ===
        assetId
      ) {
        data.faviconId =
          null;
      }

      if (
        profile.heroDefaultId ===
        assetId
      ) {
        data.heroDefaultId =
          null;
      }

      if (
        profile.openGraphId ===
        assetId
      ) {
        data.openGraphId =
          null;
      }

      if (
        Object.keys(
          data
        ).length
      ) {
        await transaction
          .brandProfile
          .update({
            where: {
              id:
                profile.id,
            },

            data,
          });
      }
    }

    return profiles.length;
  }

  async delete({
    id,
    tenantId,
  }) {
    const asset =
      await this.findOne({
        id,

        tenantId,
      });

    await this.prisma
      .$transaction(
        async (
          transaction
        ) => {
          await this
            .clearBrandProfileReferences({
              transaction,

              tenantId,

              assetId:
                asset.id,
            });

          await transaction
            .brandAsset
            .delete({
              where: {
                id:
                  asset.id,
              },
            });
        }
      );

    await this.storage.remove(
      asset.storageKey
    );

    return asset;
  }
}

module.exports = {
  BrandAssetService,
  ALLOWED_KINDS,
  DEFAULT_MAX_FILE_SIZE,
  sanitizeOriginalName,
  normalizeOptionalText,
};
