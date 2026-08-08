"use strict";

const express =
  require("express");

const multer =
  require("multer");

const {
  PrismaClient,
} = require("@prisma/client");

const {
  BrandAssetService,
  ALLOWED_KINDS,
  DEFAULT_MAX_FILE_SIZE,
} = require("./service");

const {
  LocalBrandAssetStorage,
} = require("./storage");

const {
  ALLOWED_MIME_TYPES,
} = require("./file-signatures");

const {
  resolveTenant,
} = require("./tenant-resolver");

function asyncRoute(
  handler
) {
  return (
    request,
    response,
    next
  ) => {
    Promise.resolve(
      handler(
        request,
        response,
        next
      )
    ).catch(next);
  };
}

function parseAgencyId(
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
    const error =
      new Error(
        "agencyId doit être un entier."
      );

    error.code =
      "BRAND_ASSET_AGENCY_ID_INVALID";

    error.status =
      400;

    error.statusCode =
      400;

    throw error;
  }

  return parsed;
}

function createBrandAssetRouter({
  prisma,
  storage,
} = {}) {
  const database =
    prisma ||
    new PrismaClient();

  const assetStorage =
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

  const service =
    new BrandAssetService({
      prisma:
        database,

      storage:
        assetStorage,

      maxFileSize:
        Number(
          process.env
            .BRAND_ASSET_MAX_FILE_SIZE ||
          DEFAULT_MAX_FILE_SIZE
        ),
    });

  const upload =
    multer({
      storage:
        multer.memoryStorage(),

      limits: {
        fileSize:
          Number(
            process.env
              .BRAND_ASSET_MAX_FILE_SIZE ||
            DEFAULT_MAX_FILE_SIZE
          ),

        files:
          1,

        fields:
          20,
      },
    });

  const router =
    express.Router();

  router.get(
    "/health",
    (
      request,
      response
    ) => {
      response.json({
        ok:
          true,

        capability:
          "brand-assets",

        allowedKinds:
          ALLOWED_KINDS,

        allowedMimeTypes:
          ALLOWED_MIME_TYPES,

        maxFileSize:
          Number(
            process.env
              .BRAND_ASSET_MAX_FILE_SIZE ||
            DEFAULT_MAX_FILE_SIZE
          ),
      });
    }
  );

  router.get(
    "/",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const tenant =
          await resolveTenant(
            database,
            request
          );

        const agencyId =
          request.query
            .agencyId ===
          undefined
            ? undefined
            : parseAgencyId(
                request.query
                  .agencyId
              );

        const assets =
          await service.list({
            tenantId:
              tenant.id,

            agencyId,

            kind:
              request.query
                .kind ||
              undefined,

            limit:
              request.query
                .limit,
          });

        response.json({
          count:
            assets.length,

          assets,
        });
      }
    )
  );

  router.post(
    "/upload",
    upload.single(
      "file"
    ),
    asyncRoute(
      async (
        request,
        response
      ) => {
        if (!request.file) {
          const error =
            new Error(
              "Le champ multipart file est obligatoire."
            );

          error.code =
            "BRAND_ASSET_FILE_REQUIRED";

          error.status =
            400;

          error.statusCode =
            400;

          throw error;
        }

        const tenant =
          await resolveTenant(
            database,
            request
          );

        const asset =
          await service.create({
            tenantId:
              tenant.id,

            agencyId:
              parseAgencyId(
                request.body
                  .agencyId
              ),

            kind:
              request.body
                .kind,

            originalName:
              request.file
                .originalname,

            declaredMimeType:
              request.file
                .mimetype,

            buffer:
              request.file
                .buffer,

            altText:
              request.body
                .altText ||
              null,

            title:
              request.body
                .title ||
              null,

            description:
              request.body
                .description ||
              null,

            metadata: {
              uploadedVia:
                "brand-studio-api",
            },
          });

        response
          .status(201)
          .json({
            asset,
          });
      }
    )
  );

  router.delete(
    "/:id",
    asyncRoute(
      async (
        request,
        response
      ) => {
        const tenant =
          await resolveTenant(
            database,
            request
          );

        const deleted =
          await service.delete({
            id:
              request.params
                .id,

            tenantId:
              tenant.id,
          });

        response.json({
          deleted:
            true,

          asset: {
            id:
              deleted.id,

            storageKey:
              deleted.storageKey,
          },
        });
      }
    )
  );

  return router;
}

module.exports = {
  createBrandAssetRouter,
  parseAgencyId,
  asyncRoute,
};
