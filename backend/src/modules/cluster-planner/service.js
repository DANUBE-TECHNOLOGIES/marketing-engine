const ClusterPlannerRepository = require('./repository');
const { planCluster } = require('./planner');

class ClusterPlannerService {
  constructor(prisma) { this.repository = new ClusterPlannerRepository(prisma); }

  async plan(input) {
    const destination = await this.repository.findDestination(input.destinationSlug);
    if (!destination) {
      const error = new Error(`Destination ${input.destinationSlug} introuvable`);
      error.statusCode = 404;
      throw error;
    }

    let existingPages = [];
    let site = null;
    if (input.scope === 'portfolio') {
      existingPages = await this.repository.findPortfolioPages();
    } else if (input.siteId || input.siteSlug) {
      site = await this.repository.findSite(input);
      if (!site) {
        const error = new Error('Mini-site introuvable');
        error.statusCode = 404;
        throw error;
      }
      existingPages = site.pages || [];
    }

    const result = planCluster({ destination, existingPages, limit: input.limit });
    return {
      generatedAt: new Date().toISOString(),
      scope: input.scope,
      site: site ? { id: site.id, slug: site.slug, name: site.name } : null,
      ...result
    };
  }
}

module.exports = ClusterPlannerService;
