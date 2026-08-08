"use strict";

const express =
  require(
    "express"
  );

const {
  TemplateLibraryApiService,
} =
  require(
    "./api-service"
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

function sendError(
  error,
  req,
  res,
  next
) {
  if (
    res.headersSent
  ) {
    return next(
      error
    );
  }

  const status =
    Number(
      error?.statusCode ||
      error?.status ||
      500
    );

  return res
    .status(
      status
    )
    .json({
      error:
        error?.code ||
        "TEMPLATE_LIBRARY_ERROR",

      message:
        error?.message ||
        "Erreur Template Library.",
    });
}

function createTemplateLibraryRouter({
  prisma,
} = {}) {
  if (!prisma) {
    throw new Error(
      "PrismaClient obligatoire pour Template Library API."
    );
  }

  const router =
    express.Router();

  const service =
    new TemplateLibraryApiService({
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
    "/templates",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const agencyId =
          req.query.agencyId
            ? Number(
                req.query.agencyId
              )
            : null;

        if (agencyId) {
          await service
            .assertAgency({
              agencyId,
              tenantId:
                tenant.id,
            });
        }

        const templates =
          await service
            .listTemplates({
              tenantId:
                tenant.id,

              agencyId,

              pageType:
                req.query.pageType ||
                undefined,

              variant:
                req.query.variant ||
                undefined,
            });

        res.json({
          tenant: {
            id:
              tenant.id,

            slug:
              tenant.slug,
          },

          count:
            templates.length,

          templates,
        });
      }
    )
  );

  router.get(
    "/templates/:id",
    asyncRoute(
      async (
        req,
        res
      ) => {
        await service
          .resolveTenant(
            tenantHints(
              req
            )
          );

        const template =
          await service
            .getTemplate(
              req.params.id
            );

        res.json(
          template
        );
      }
    )
  );

  router.get(
    "/resolve",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const agencyId =
          req.query.agencyId
            ? Number(
                req.query.agencyId
              )
            : null;

        const result =
          await service
            .resolve({
              tenantId:
                tenant.id,

              agencyId,

              pageType:
                req.query.pageType,

              variant:
                req.query.variant ||
                "default",
            });

        res.json(
          result
        );
      }
    )
  );

  router.get(
    "/preview",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .preview({
              tenantId:
                tenant.id,

              agencyId:
                req.query.agencyId,

              pageType:
                req.query.pageType,

              variant:
                req.query.variant ||
                "default",
            });

        res.json(
          result
        );
      }
    )
  );

  router.get(
    "/drafts",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const drafts =
          await service
            .listAgencyDrafts({
              tenantId:
                tenant.id,

              agencyId:
                req.query.agencyId,

              pageType:
                req.query.pageType ||
                undefined,
            });

        res.json({
          count:
            drafts.length,

          drafts:
            drafts.map(
              draft => ({
                id:
                  draft.id,

                templateKey:
                  draft.templateKey,

                name:
                  draft.name,

                description:
                  draft.description,

                pageType:
                  draft.pageType,

                variant:
                  draft.variant,

                version:
                  draft.version,

                scope:
                  draft.scope,

                status:
                  draft.status,

                tenantId:
                  draft.tenantId,

                agencyId:
                  draft.agencyId,

                createdAt:
                  draft.createdAt,

                updatedAt:
                  draft.updatedAt,
              })
            ),
        });
      }
    )
  );

  router.post(
    "/clone-draft",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .cloneAgencyDraft({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              pageType:
                req.body.pageType,

              variant:
                req.body.variant ||
                "default",

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

  router.get(
    "/drafts/:id/preview",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .previewDraft({
              tenantId:
                tenant.id,

              agencyId:
                req.query.agencyId,

              draftId:
                req.params.id,
            });

        res.json(
          result
        );
      }
    )
  );

  router.put(
    "/drafts/:id",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .updateDraft({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              draftId:
                req.params.id,

              definition:
                req.body.definition,

              actor:
                req.user?.id ||
                req.user?.email ||
                null,
            });

        res.json(
          result
        );
      }
    )
  );

  router.get(
    "/drafts/:id/diff",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .diffDraft({
              tenantId:
                tenant.id,

              agencyId:
                req.query.agencyId,

              draftId:
                req.params.id,
            });

        res.json(
          result
        );
      }
    )
  );

  router.post(
    "/drafts/:id/activate",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .activateDraft({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              draftId:
                req.params.id,

              actor:
                req.user?.id ||
                req.user?.email ||
                null,
            });

        res.json(
          result
        );
      }
    )
  );

  router.get(
    "/history",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .versionHistory({
              tenantId:
                tenant.id,

              agencyId:
                req.query.agencyId,

              pageType:
                req.query.pageType,

              variant:
                req.query.variant ||
                "default",
            });

        res.json(
          result
        );
      }
    )
  );

  router.post(
    "/rollback",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .rollbackAgencyTemplate({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              templateId:
                req.body.templateId,

              actor:
                req.user?.id ||
                req.user?.email ||
                null,
            });

        res.json(
          result
        );
      }
    )
  );

  router.post(
    "/inherit",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .revertToInheritance({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              pageType:
                req.body.pageType,

              variant:
                req.body.variant ||
                "default",
            });

        res.json(
          result
        );
      }
    )
  );

  router.get(
    "/assignments",
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const agencyId =
          req.query.agencyId
            ? Number(
                req.query.agencyId
              )
            : null;

        if (agencyId) {
          await service
            .assertAgency({
              agencyId,
              tenantId:
                tenant.id,
            });
        }

        const result =
          await service
            .listAssignments({
              tenantId:
                tenant.id,

              agencyId,
            });

        res.json(
          result
        );
      }
    )
  );

  router.post(
    "/assignments",
    express.json(),
    asyncRoute(
      async (
        req,
        res
      ) => {
        const tenant =
          await service
            .resolveTenant(
              tenantHints(
                req
              )
            );

        const result =
          await service
            .assign({
              tenantId:
                tenant.id,

              agencyId:
                req.body.agencyId,

              scope:
                req.body.scope,

              pageType:
                req.body.pageType,

              variant:
                req.body.variant ||
                "default",

              templateId:
                req.body.templateId,

              actor:
                req.user?.id ||
                req.user?.email ||
                null,
            });

        res
          .status(
            200
          )
          .json(
            result
          );
      }
    )
  );

  router.use(
    sendError
  );

  return router;
}

module.exports = {
  createTemplateLibraryRouter,
};
