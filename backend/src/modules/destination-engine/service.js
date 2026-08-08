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

class DestinationService {
  constructor(prisma) {
    this.repo = new DestinationRepository(prisma);
    this.publicRepo = new PublicDestinationRepository(prisma);
  }

  list(publishedOnly = false) {
    return this.repo.list(publishedOnly);
  }

  async get(slug, publishedOnly = false) {
    const destination = await this.repo.findBySlug(slug, publishedOnly);
    if (!destination) {
      const e = new Error(`Destination ${slug} introuvable`);
      e.statusCode = 404;
      throw e;
    }
    return destination;
  }

  seedBudapest() {
    return this.repo.upsertBudapest();
  }

  async publicForSite(siteSlug, destinationSlug) {
    const site = await this.repo.findPublicSite(siteSlug);

    if (!site || !sitePublished(site)) {
      const e = new Error(`Mini-site ${siteSlug} introuvable`);
      e.statusCode = 404;
      throw e;
    }

    const tenantId = site.tenantId || site.agency?.tenantId || null;

    const destination = await this.publicRepo.findPublishedForTenant(
      tenantId,
      destinationSlug
    );

    if (!destination) {
      const e = new Error(`Destination ${destinationSlug} introuvable`);
      e.statusCode = 404;
      throw e;
    }

    return {
      site: {
        id: site.id,
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
