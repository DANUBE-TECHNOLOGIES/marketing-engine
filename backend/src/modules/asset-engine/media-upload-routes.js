"use strict";

const express = require("express");
const multer = require("multer");

const {
  LocalAssetMediaStorage,
} = require("./media-storage");

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

const MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function createMediaUploadRoutes({
  storage,
} = {}) {
  const router =
    express.Router();

  const mediaStorage =
    storage ||
    new LocalAssetMediaStorage();

  const upload =
    multer({
      storage:
        multer.memoryStorage(),

      limits: {
        fileSize:
          Number(
            process.env
              .ASSET_MEDIA_MAX_FILE_SIZE ||
            MAX_FILE_SIZE
          ),
        files: 1,
      },
    });

  router.post(
    "/api/assets/media/upload",
    upload.single("file"),
    async (
      req,
      res,
      next
    ) => {
      try {
        const tenantId =
          String(
            req.headers[
              "x-tenant-id"
            ] || ""
          ).trim();

        if (!tenantId) {
          return res
            .status(400)
            .json({
              error:
                "L’en-tête x-tenant-id est obligatoire.",
            });
        }

        if (!req.file) {
          return res
            .status(400)
            .json({
              error:
                "Le champ multipart file est obligatoire.",
            });
        }

        const extension =
          MIME_TYPES[
            req.file.mimetype
          ];

        if (!extension) {
          return res
            .status(400)
            .json({
              error:
                "Format média non autorisé.",
            });
        }

        const usage =
          String(
            req.body?.usage ||
            "media"
          ).trim();

        const storageKey =
          mediaStorage
            .buildStorageKey({
              tenantId,
              usage,
              extension,
            });

        const stored =
          await mediaStorage.write({
            storageKey,
            buffer:
              req.file.buffer,
          });

        return res
          .status(201)
          .json({
            storageKey:
              stored.storageKey,

            url:
              stored.publicUrl,

            mimeType:
              req.file.mimetype,

            size:
              req.file.size,

            originalName:
              req.file.originalname,
          });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports =
  createMediaUploadRoutes;
