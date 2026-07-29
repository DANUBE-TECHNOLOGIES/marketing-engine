const DestinationRepository = require('./repository');
class DestinationService {
  constructor(prisma) { this.repo = new DestinationRepository(prisma); }
  list(publishedOnly = false) { return this.repo.list(publishedOnly); }
  async get(slug, publishedOnly = false) {
    const destination = await this.repo.findBySlug(slug, publishedOnly);
    if (!destination) { const e = new Error(`Destination ${slug} introuvable`); e.statusCode = 404; throw e; }
    return destination;
  }
  seedBudapest() { return this.repo.upsertBudapest(); }
  async publicForSite(siteSlug, destinationSlug) {
    const [site, destination] = await Promise.all([
      this.repo.findPublicSite(siteSlug), this.repo.findBySlug(destinationSlug, true)
    ]);
    if (!site) { const e = new Error(`Mini-site ${siteSlug} introuvable`); e.statusCode = 404; throw e; }
    if (!destination) { const e = new Error(`Destination ${destinationSlug} introuvable`); e.statusCode = 404; throw e; }
    return {
      site: { id: site.id, slug: site.slug, name: site.name, basePath: `/agence/${site.slug}`, agency: site.agency },
      destination,
      quotePath: `/agence/${site.slug}/contact?destination=${destination.slug}`,
      canonicalPath: `/agence/${site.slug}/destination/${destination.slug}`
    };
  }
}
module.exports = DestinationService;
