const express = require('express');
const ClusterPlannerService = require('./service');
const { validatePlanInput } = require('./validation');

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new ClusterPlannerService(prisma);

  router.get('/cluster-planner/health', (req, res) => {
    res.json({ ok: true, version: '1.0.0', capability: 'seo-cluster-planner' });
  });

  router.post('/cluster-planner/plan', async (req, res, next) => {
    try {
      const input = validatePlanInput(req.body);
      res.json(await service.plan(input));
    } catch (error) { next(error); }
  });

  router.get('/cluster-planner/destination/:slug', async (req, res, next) => {
    try {
      const input = validatePlanInput({
        destinationSlug: req.params.slug,
        siteId: req.query.siteId,
        siteSlug: req.query.siteSlug,
        scope: req.query.scope,
        limit: req.query.limit
      });
      res.json(await service.plan(input));
    } catch (error) { next(error); }
  });

  return router;
};
