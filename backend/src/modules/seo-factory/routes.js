const express = require("express");
const SeoFactoryService = require("./service");
const { validateGenerate } = require("./validation");

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new SeoFactoryService(prisma);

  router.post("/seo-factory/generate", async (req, res, next) => {
    try {
      const input = validateGenerate(req.body);
      const result = await service.generate(input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/seo-factory/sites/:siteId/publish", async (req, res, next) => {
    try {
      const input = validateGenerate({ ...req.body, siteId: req.params.siteId, publish: true });
      const result = await service.publishExisting(req.params.siteId, input);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
