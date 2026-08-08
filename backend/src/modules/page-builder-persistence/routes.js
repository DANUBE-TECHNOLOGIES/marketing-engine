"use strict";

const express =
  require("express");

/*
 * service.js exporte directement la classe :
 *
 * module.exports =
 *   PageBuilderPersistenceService;
 */
const PageBuilderPersistenceService =
  require("./service");

const {
  normalizePageBuilderPayload,
} = require(
  "./payload-normalizer"
);

function errorStatus(
  error
) {
  if (
    Number.isInteger(
      error?.statusCode
    )
  ) {
    return error.statusCode;
  }

  if (
    Number.isInteger(
      error?.status
    )
  ) {
    return error.status;
  }

  if (
    error?.code ===
      "PAGE_NOT_FOUND" ||
    error?.code ===
      "PAGE_BUILDER_PAGE_NOT_FOUND" ||
    error?.code ===
      "PAGE_BUILDER_VERSION_NOT_FOUND"
  ) {
    return 404;
  }

  if (
    error?.code &&
    String(error.code)
      .startsWith(
        "PAGE_"
      )
  ) {
    return 400;
  }

  return 500;
}

function sendError(
  response,
  error
) {
  response
    .status(
      errorStatus(error)
    )
    .json({
      error:
        error?.code ||
        "PAGE_BUILDER_PERSISTENCE_ERROR",

      message:
        error?.message ||
        "Erreur de persistance de la page.",

      details:
        error?.details ||
        {},
    });
}

function resolveTenantId(
  request
) {
  return (
    request.tenantId ||
    request.tenant?.id ||
    null
  );
}

function metadataFromRequest(
  request
) {
  return {
    createdBy:
      request.body
        ?.createdBy ||
      request.user?.id ||
      null,

    reason:
      request.body
        ?.reason ||
      null,

    tenantId:
      resolveTenantId(
        request
      ),
  };
}

function routes({
  prisma,
  service,
} = {}) {
  const router =
    express.Router();

  /*
   * Le constructeur réel est :
   *
   * constructor(prisma, tenantId)
   */
  function persistenceServiceFor(
    request
  ) {
    if (service) {
      return service;
    }

    return new PageBuilderPersistenceService(
      prisma,
      resolveTenantId(
        request
      )
    );
  }

  router.get(
    "/agencies/:agencyId/site/pages/:pageSlug/blocks",
    async (
      request,
      response
    ) => {
      try {
        const persistenceService =
          persistenceServiceFor(
            request
          );

        /*
         * Contrat réel :
         * get(agencyId, slug)
         */
        const result =
          await persistenceService
            .get(
              request.params
                .agencyId,

              request.params
                .pageSlug
            );

        response.json(
          result
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.put(
    "/agencies/:agencyId/site/pages/:pageSlug/blocks",
    async (
      request,
      response
    ) => {
      try {
        const persistenceService =
          persistenceServiceFor(
            request
          );

        let existingPage =
          null;

        try {
          /*
           * Contrat réel :
           * get(agencyId, slug)
           */
          existingPage =
            await persistenceService
              .get(
                request.params
                  .agencyId,

                request.params
                  .pageSlug
              );
        } catch (error) {
          if (
            error?.code !==
              "PAGE_BUILDER_PAGE_NOT_FOUND" &&
            error?.statusCode !==
              404
          ) {
            throw error;
          }
        }

        const normalized =
          normalizePageBuilderPayload({
            body:
              request.body,

            params:
              request.params,

            existingPage:
              existingPage,
          });

        /*
         * validatePagePayload attend la structure :
         *
         * {
         *   page: { ... },
         *   blocks: [ ... ]
         * }
         */
        const persistencePayload = {
          page: {
            title:
              normalized.title,

            slug:
              normalized.slug,

            status:
              normalized.status,

            seoTitle:
              normalized.seoTitle,

            metaDescription:
              normalized
                .seoDescription,

            published:
              normalized.published ===
              true,
          },

          blocks:
            normalized.blocks,
        };

        /*
         * Contrat réel :
         * save(agencyId, slug, body, metadata)
         */
        const result =
          await persistenceService
            .save(
              request.params
                .agencyId,

              request.params
                .pageSlug,

              persistencePayload,

              metadataFromRequest(
                request
              )
            );

        response.json(
          result
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.get(
    "/agencies/:agencyId/site/pages/:pageSlug/versions",
    async (
      request,
      response
    ) => {
      try {
        const persistenceService =
          persistenceServiceFor(
            request
          );

        /*
         * Contrat réel :
         * versions(agencyId, slug)
         */
        const result =
          await persistenceService
            .versions(
              request.params
                .agencyId,

              request.params
                .pageSlug
            );

        response.json(
          result
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.post(
    "/agencies/:agencyId/site/pages/:pageSlug/versions/:versionId/rollback",
    async (
      request,
      response
    ) => {
      try {
        const persistenceService =
          persistenceServiceFor(
            request
          );

        /*
         * Contrat réel :
         * rollback(
         *   agencyId,
         *   slug,
         *   versionId,
         *   metadata
         * )
         */
        const result =
          await persistenceService
            .rollback(
              request.params
                .agencyId,

              request.params
                .pageSlug,

              request.params
                .versionId,

              metadataFromRequest(
                request
              )
            );

        response.json(
          result
        );
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  return router;
}

module.exports = {
  errorStatus,
  routes,
  sendError,
};
