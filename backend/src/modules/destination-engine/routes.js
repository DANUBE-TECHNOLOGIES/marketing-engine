const express = require('express');
const DestinationService = require('./service');

async function publicTenantId(prisma, req) {
  const direct = String(
    req?.tenant?.id || req?.tenantId || req.get('x-tenant-id') || ''
  ).trim();
  if (direct) return direct;

  const slug = String(
    req?.tenant?.slug || req?.tenantSlug || req.get('x-tenant-slug') || ''
  ).trim();
  if (!slug) {
    const error = new Error('Le tenant est obligatoire pour une destination publique.');
    error.statusCode = 400;
    error.code = 'PUBLIC_DESTINATION_TENANT_REQUIRED';
    throw error;
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!tenant) {
    const error = new Error('Tenant public introuvable.');
    error.statusCode = 404;
    error.code = 'PUBLIC_DESTINATION_TENANT_NOT_FOUND';
    throw error;
  }
  return String(tenant.id);
}

module.exports = ({ prisma }) => {
  const router = express.Router();
  const service = new DestinationService(prisma);
  router.get('/destinations', async (req, res, next) => { try { res.json(await service.list(req.query.status === 'published')); } catch (e) { next(e); } });
  router.get('/destinations/:slug', async (req, res, next) => { try { res.json(await service.get(req.params.slug)); } catch (e) { next(e); } });
  router.post('/destinations/seed/budapest', async (_req, res, next) => { try { res.status(201).json(await service.seedBudapest()); } catch (e) { next(e); } });
  router.get('/public/agency-sites/:siteSlug/destinations/:destinationSlug', async (req, res, next) => {
    try {
      const tenantId = await publicTenantId(prisma, req);
      res.json(await service.publicForSite(req.params.siteSlug, req.params.destinationSlug, tenantId));
    } catch (e) { next(e); }
  });
  return router;
};

module.exports.publicTenantId = publicTenantId;
