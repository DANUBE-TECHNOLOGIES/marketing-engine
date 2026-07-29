class ClusterPlannerRepository {
  constructor(prisma) { this.prisma = prisma; }

  findDestination(slug) {
    return this.prisma.destination.findUnique({
      where: { slug },
      include: {
        themes: { include: { theme: true }, orderBy: { weight: 'desc' } },
        travelTypes: { include: { travelType: true }, orderBy: { weight: 'desc' } },
        tags: { include: { tag: true } },
        relationsFrom: { include: { target: true }, orderBy: { score: 'desc' }, take: 10 }
      }
    });
  }

  findSite({ siteId, siteSlug }) {
    if (siteId) {
      return this.prisma.agencySite.findUnique({
        where: { id: siteId },
        include: { pages: { include: { sections: true }, orderBy: { displayOrder: 'asc' } } }
      });
    }
    if (siteSlug) {
      return this.prisma.agencySite.findUnique({
        where: { slug: siteSlug },
        include: { pages: { include: { sections: true }, orderBy: { displayOrder: 'asc' } } }
      });
    }
    return Promise.resolve(null);
  }

  findPortfolioPages() {
    return this.prisma.agencySitePage.findMany({
      include: { site: { select: { id: true, slug: true, name: true } } },
      orderBy: { updatedAt: 'desc' }
    });
  }
}

module.exports = ClusterPlannerRepository;
