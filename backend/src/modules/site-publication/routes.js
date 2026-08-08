"use strict";

const express =
  require(
    "express"
  );

const path =
  require(
    "node:path"
  );

const {
  normalizeSitePublicationError,
} =
  require(
    "./errors"
  );

const {
  SitePublicationHistoryStore,
} =
  require(
    "./history-store"
  );

const {
  SitePublicationLockManager,
} =
  require(
    "./lock-manager"
  );

const {
  PagePublicationClient,
} =
  require(
    "./page-publication-client"
  );

const {
  SiteReadinessClient,
} =
  require(
    "./readiness-client"
  );

const {
  SitePublicationRepository,
} =
  require(
    "./repository"
  );

const {
  SitePublicationService,
} =
  require(
    "./service"
  );

function requestHeaders(
  request
) {
  const result = {};

  for (
    const name
    of [
      "authorization",
      "cookie",
      "x-tenant-id",
      "x-tenant-slug",
      "x-request-id",
      "x-user-id",
      "x-user-name",
    ]
  ) {
    const value =
      request.get(
        name
      );

    if (value) {
      result[name] =
        value;
    }
  }

  return result;
}

function sendError(
  response,
  error
) {
  const normalized =
    normalizeSitePublicationError(
      error
    );

  response
    .status(
      normalized.statusCode
    )
    .json({
      error:
        normalized.code,

      message:
        normalized.message,

      details:
        normalized.details ||
        {},
    });
}

function createSitePublicationRoutes(
  prisma,
  options = {}
) {
  const router =
    express.Router();

  const repository =
    options.repository ||
    new SitePublicationRepository({
      prisma,
    });

  const readinessClient =
    options.readinessClient ||
    new SiteReadinessClient({
      frontendOrigin:
        process.env
          .SITE_PUBLICATION_FRONTEND_ORIGIN ||
        process.env
          .FRONTEND_INTERNAL_URL ||
        "http://frontend:3000",
    });

  const pagePublicationClient =
    options.pagePublicationClient ||
    new PagePublicationClient({
      backendOrigin:
        process.env
          .SITE_PUBLICATION_BACKEND_ORIGIN ||
        `http://127.0.0.1:${
          process.env.PORT ||
          4000
        }`,
    });

  const historyStore =
    options.historyStore ||
    new SitePublicationHistoryStore({
      storageDirectory:
        process.env
          .SITE_PUBLICATION_HISTORY_DIR ||
        path.resolve(
          process.cwd(),
          "storage/site-publication-history"
        ),
    });

  const lockManager =
    options.lockManager ||
    new SitePublicationLockManager();

  const service =
    options.service ||
    new SitePublicationService({
      repository,
      readinessClient,
      pagePublicationClient,
      historyStore,
      lockManager,
    });

  router.get(
    "/sites/:siteId/status",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await service.status(
            request.params.siteId
          )
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
    "/sites/:siteId/plan",
    async (
      request,
      response
    ) => {
      try {
        response.json(
          await service.plan({
            siteId:
              request.params.siteId,

            headers:
              requestHeaders(
                request
              ),
          })
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
    "/sites/:siteId/history",
    async (
      request,
      response
    ) => {
      try {
        response.json({
          siteId:
            request.params.siteId,

          items:
            await service.history(
              request.params.siteId,
              {
                limit:
                  request.query.limit,
              }
            ),
        });
      } catch (error) {
        sendError(
          response,
          error
        );
      }
    }
  );

  router.post(
    "/sites/:siteId/publish",
    async (
      request,
      response
    ) => {
      try {
        const result =
          await service.publish({
            siteId:
              request.params.siteId,

            headers: {
              ...requestHeaders(
                request
              ),

              "x-site-publication-force-token":
                request.headers[
                  "x-site-publication-force-token"
                ] ||
                "",
            },

            force:
              request.body
                ?.force ===
              true,

            planToken:
              request.body
                ?.planToken ||
              null,
          });

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
    "/sites/:siteId/unpublish",
    async (
      request,
      response
    ) => {
      try {
        const result =
          await service.unpublish({
            siteId:
              request.params.siteId,

            headers:
              requestHeaders(
                request
              ),
          });

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
  createSitePublicationRoutes,
  requestHeaders,
  sendError,
};
