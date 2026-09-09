const DestinationRepository = require('./repository');
const PublicDestinationRepository = require('./public-repository');
const {
  PublicDestinationExposureResolver,
} = require('../public-site-read/destination-exposure');

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

function normalizeEditorialRelations(destination, exposedSlugs, tenantId, siteSlug) {
  const relations = Array.isArray(destination?.relationsFrom)
    ? destination.relationsFrom
    : [];
  const exposed = new Set(
    (exposedSlugs || [])
      .map((slug) => String(slug || '').trim().toLowerCase())
      .filter(Boolean)
  );
  const sourceSlug = String(destination?.slug || '').trim().toLowerCase();
  const seen = new Set();
  const result = [];

  for (const relation of relations) {
    const target = relation?.target;
    const slug = String(target?.slug || '').trim();
    const normalizedSlug = slug.toLowerCase();
    const name = String(target?.name || '').trim();

    if (String(relation?.origin || '').toLowerCase() !== 'manual') continue;
    if (String(target?.status || '').toLowerCase() !== 'published') continue;
    if (String(target?.tenantId || '') !== String(tenantId)) continue;
    if (!slug || !name || normalizedSlug === sourceSlug) continue;
    if (!exposed.has(normalizedSlug) || seen.has(normalizedSlug)) continue;

    seen.add(normalizedSlug);
    result.push({
      name,
      href: `/agence/${siteSlug}/destination/${slug}`,
    });
  }

  return result;
}

class DestinationService {
  constructor(prisma) {
    this.repo = new DestinationRepository(prisma);
    this.publicRepo = new PublicDestinationRepository(prisma);
    this.exposureResolver = new PublicDestinationExposureResolver(prisma);
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

    const exposedDestinationSlugs = await this.exposureResolver.resolve(
      siteSlug,
      normalizedTenantId
    );
    const exposed = new Set(
      (exposedDestinationSlugs || []).map((slug) =>
        String(slug || '').trim().toLowerCase()
      )
    );

    if (!exposed.has(String(destination.slug || '').trim().toLowerCase())) {
      const e = new Error(
        `Destination ${destination.slug} non exposée par le mini-site ${siteSlug}`
      );
      e.statusCode = 404;
      e.code = 'PUBLIC_DESTINATION_NOT_EXPOSED';
      throw e;
    }

    const editorialRelations = normalizeEditorialRelations(
      destination,
      exposedDestinationSlugs,
      normalizedTenantId,
      site.slug
    );
    const publicDestination = { ...destination };
    delete publicDestination.relationsFrom;

    const pages = Array.isArray(site.pages)
      ? site.pages
          .filter((page) => page?.published === true && String(page?.status || '').toLowerCase() === 'published')
          .map((page) => ({
            id: page.id,
            slug: page.slug,
            title: page.title,
            pageType: page.pageType,
          }))
      : [];

    return {
      site: {
        id: site.id,
        tenantId: site.tenantId || site.agency?.tenantId || normalizedTenantId,
        agencyId: site.agencyId,
        slug: site.slug,
        name: site.name,
        basePath: `/agence/${site.slug}`,
        agency: site.agency,
        pages,
      },
      destination: publicDestination,
      editorialRelations,
      quotePath: `/agence/${site.slug}/contact?destination=${destination.slug}`,
      canonicalPath: `/agence/${site.slug}/destination/${destination.slug}`,
    };
  }
}

module.exports = DestinationService;
module.exports.sitePublished = sitePublished;
module.exports.requireTenantId = requireTenantId;
module.exports.normalizeEditorialRelations = normalizeEditorialRelations;
