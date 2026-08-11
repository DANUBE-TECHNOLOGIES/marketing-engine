const DestinationRepository = require('./repository');
const PublicDestinationRepository = require('./public-repository');

function sitePublished(site) {
  if (!site) return false;

  if (site.published === true || site.isPublished === true) {
    return true;
  }

  if (String(site.status || '').toLowerCase() === 'published') {
    return true;
  }

  return Boolean(site.publishedAt);
}

function requireTenantId(value) {
  const tenantId = String(value || '').trim();
  if (!tenantId) {
    const error = new Error('Le tenant est obligatoire pour le moteur Destination.');
    error.statusCode = 400;
    error.code = 'DESTINATION_TENANT_REQUIRED';
    throw error;
  }
  return tenantId;
}

class DestinationService {
  constructor(prisma) {
    this.repo = new DestinationRepository(prisma);
    this.publicRepo = new PublicDestinationRepository(prisma);
  }

  list(tenantId, publishedOnly = false) {
    return this.repo.list(requireTenantId(tenantId), publishedOnly);
  }

  async get(tenantId, slug, publishedOnly = false) {
    const destination = await this.repo.findBySlug(
      requireTenantId(tenantId),
      slug,
      publishedOnly
    );
    if (!destination) {
      const e = new Error(`Destination ${slug} introuvable`);
      e.statusCode = 404;
      e.code = 'DESTINATION_NOT_FOUND';
      throw e;
    }
    return destination;
  }

  seedBudapest(tenantId) {
    return this.repo.upsertBudapest(requireTenantId(tenantId));
  }

  async publicForSite(siteSlug, destinationSlug, tenantId) {
    const normalizedTenantId = requireTenantId(tenantId);
    const site = await this.repo.findPublicSite(siteSlug, normalizedTenantId);

    if (!site || !sitePublished(site)) {
      const e = new Error(`Mini-site ${siteSlug} introuvable`);
      e.statusCode = 404;
      e.code = 'PUBLIC_DESTINATION_SITE_NOT_FOUND';
      throw e;
    }

    const destination = await this.publicRepo.findPublishedForTenant(
      normalizedTenantId,
      destinationSlug
    );

    if (!destination) {
      const e = new Error(`Destination ${destinationSlug} introuvable`);
      e.statusCode = 404;
      e.code = 'PUBLIC_DESTINATION_NOT_FOUND';
      throw e;
    }

    return {
      site: {
        id: site.id,
        tenantId: site.tenantId || site.agency?.tenantId || normalizedTenantId,
        agencyId: site.agencyId,
        slug: site.slug,
        name: site.name,
        basePath: `/agence/${site.slug}`,
        agency: site.agency,
      },
      destination,
      quotePath: `/agence/${site.slug}/contact?destination=${destination.slug}`,
      canonicalPath: `/agence/${site.slug}/destination/${destination.slug}`,
    };
  }
}

module.exports = DestinationService;
module.exports.sitePublished = sitePublished;
module.exports.requireTenantId = requireTenantId;
