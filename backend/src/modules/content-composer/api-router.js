"use strict";

const express =
  require(
    "express"
  );

const {
  ContentComposerService,
} =
  require(
    "./service"
  );

const {
  contentComposerMetrics,
} =
  require(
    "./metrics"
  );

function asyncRoute(
  handler
) {
  return async (
    req,
    res,
    next
  ) => {
    try {
      await handler(
        req,
        res,
        next
      );
    } catch (error) {
      next(
        error
      );
    }
  };
}

function tenantHints(
  req
) {
  return {
    tenantId:
      req.tenantId ||
      req.tenant?.id ||
      req.headers[
        "x-tenant-id"
      ] ||
      null,

    tenantSlug:
      req.tenant?.slug ||
      req.headers[
        "x-tenant-slug"
      ] ||
      null,
  };
}

async function resolveTenant(
  prisma,
  hints
) {
  if (
    hints.tenantId
  ) {
    const tenant =
      await prisma.tenant.findUnique({
        where: {
          id:
            hints.tenantId,
        },
      });

    if (tenant) {
      return tenant;
    }
  }

  if (
    hints.tenantSlug
  ) {
    const tenant =
      await prisma.tenant.findFirst({
        where: {
          slug:
            hints.tenantSlug,
        },
      });

    if (tenant) {
      return tenant;
    }
  }

  const error =
    new Error(
      "Tenant introuvable."
    );

  error.code =
    "TENANT_NOT_FOUND";

  error.statusCode =
    404;

  throw error;
}

function createContentComposerRouter({
  prisma,
} = {}) {
  if (!prisma) {
    throw new Error(
      "PrismaClient obligatoire pour Content Composer."
    );
  }

  const router =
    express.Router();

  const service =
    new ContentComposerService({
      prisma,
    });

  router.get(
    "/health",
    (
      req,
      res
    ) => {
      res.json(
        service.health()
      );
    }
  );

  router.get(
    "/metrics",
    (
      req,
      res
    ) => {
      res.json({
        module:
          "content-composer",

        metrics:
          contentComposerMetrics
            .snapshot(),
      });
    }
  );

  router.post(
    "/draft",
    express.json({
      limit:
        "2mb",
    }),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await resolveTenant(
            prisma,
            tenantHints(
              req
            )
          );

        const result =
          await service
            .createDraftFromGeneration({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              generation:
                req.body.generation,

              actor:
                req.user?.id ||
                req.user?.email ||
                null,
            });

        res
          .status(
            201
          )
          .json(
            result
          );
      }
    )
  );

  router.post(
    "/compose",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await resolveTenant(
            prisma,
            tenantHints(
              req
            )
          );

        const result =
          await service.compose({
            tenantId:
              tenant.id,

            agencyId:
              req.body.agencyId,

            pageType:
              req.body.pageType,

            variant:
              req.body.variant ||
              "default",

            instructions:
              req.body.instructions ||
              "",

            seo:
              req.body.seo ||
              {},
          });

        res.json(
          result
        );
      }
    )
  );

  router.use(
    (
      error,
      req,
      res,
      next
    ) => {
      if (
        res.headersSent
      ) {
        return next(
          error
        );
      }

      res
        .status(
          Number(
            error.statusCode ||
            500
          )
        )
        .json({
          error:
            error.code ||
            "CONTENT_COMPOSER_ERROR",

          message:
            error.message ||
            "Erreur Content Composer.",
        });
    }
  );

  return router;
}

module.exports = {
  createContentComposerRouter,
};
