const express = require("express");

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next))
      .catch(next);
  };
}

function createAssetRoutes(controller) {
  const router = express.Router();

  router.get(
    "/api/assets",
    asyncHandler(controller.list)
  );

  router.post(
    "/api/assets",
    asyncHandler(controller.create)
  );

  router.get(
    "/api/assets/:id/versions/:version",
    asyncHandler(controller.getVersion)
  );

  router.get(
    "/api/assets/:id/versions",
    asyncHandler(controller.listVersions)
  );

  router.post(
    "/api/assets/:id/publish",
    asyncHandler(controller.publish)
  );

  router.post(
    "/api/assets/:id/archive",
    asyncHandler(controller.archive)
  );

  router.post(
    "/api/assets/:id/duplicate",
    asyncHandler(controller.duplicate)
  );

  router.get(
    "/api/assets/:id",
    asyncHandler(controller.get)
  );

  router.patch(
    "/api/assets/:id",
    asyncHandler(controller.update)
  );

  router.delete(
    "/api/assets/:id",
    asyncHandler(controller.remove)
  );

  return router;
}

module.exports = createAssetRoutes;
