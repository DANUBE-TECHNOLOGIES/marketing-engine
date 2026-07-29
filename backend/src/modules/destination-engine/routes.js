const express = require('express');
const DestinationService = require('./service');
module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new DestinationService(prisma);
  router.get('/destinations', async (req, res, next) => { try { res.json(await service.list(req.query.status === 'published')); } catch (e) { next(e); } });
  router.get('/destinations/:slug', async (req, res, next) => { try { res.json(await service.get(req.params.slug)); } catch (e) { next(e); } });
  router.post('/destinations/seed/budapest', async (_req, res, next) => { try { res.status(201).json(await service.seedBudapest()); } catch (e) { next(e); } });
  router.get('/public/agency-sites/:siteSlug/destinations/:destinationSlug', async (req, res, next) => {
    try { res.json(await service.publicForSite(req.params.siteSlug, req.params.destinationSlug)); } catch (e) { next(e); }
  });
  return router;
};
