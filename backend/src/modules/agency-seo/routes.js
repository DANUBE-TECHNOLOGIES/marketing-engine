const express = require("express");

const {
  validateSiteCreation,
  validatePageCreation
} = require("./validation");

function createAgencySeoRoutes(service) {
  const router = express.Router();

  router.get(
    "/sites",
    async (req, res, next) => {
      try {
        const sites =
          await service.listSites();

        res.json({
          total: sites.length,
          sites
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/sites/:id",
    async (req, res, next) => {
      try {
        const site =
          await service.getSite(
            req.params.id
          );

        res.json({
          site
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/sites",
    async (req, res, next) => {
      try {
        const data =
          validateSiteCreation(
            req.body
          );

        const site =
          await service.createSite(data);

        res.status(201).json({
          site
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/sites/:id",
    async (req, res, next) => {
      try {
        const site =
          await service.updateSite(
            req.params.id,
            req.body
          );

        res.json({
          site
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/sites/:siteId/pages",
    async (req, res, next) => {
      try {
        await service.getSite(
          req.params.siteId
        );

        const pages =
          await service.listPages(
            req.params.siteId
          );

        res.json({
          total: pages.length,
          pages
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    "/pages/:id",
    async (req, res, next) => {
      try {
        const page =
          await service.getPage(
            req.params.id
          );

        res.json({
          page
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    "/pages",
    async (req, res, next) => {
      try {
        const data =
          validatePageCreation(
            req.body
          );

        const page =
          await service.createPage(data);

        res.status(201).json({
          page
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.patch(
    "/pages/:id",
    async (req, res, next) => {
      try {
        const page =
          await service.updatePage(
            req.params.id,
            req.body
          );

        res.json({
          page
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

module.exports = createAgencySeoRoutes;
