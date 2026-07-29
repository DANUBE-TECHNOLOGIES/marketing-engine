"use strict";

class SeoBrainRepository {
  constructor(prisma) { this.prisma = prisma; }

  findPage(id) {
    return this.prisma.agencySitePage.findUnique({
      where: { id },
      include: { site: true, sections: { orderBy: { displayOrder: "asc" } } }
    });
  }

  findSite(id) {
    return this.prisma.agencySite.findUnique({
      where: { id },
      include: {
        agency: true,
        pages: { include: { sections: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } }
      }
    });
  }

  listSites() {
    return this.prisma.agencySite.findMany({
      include: { agency: true, pages: { include: { sections: true } } },
      orderBy: { updatedAt: "desc" }
    });
  }

  listCampaigns(siteId) {
    if (!this.prisma.marketingCampaign) return [];
    return this.prisma.marketingCampaign.findMany({
      where: { siteId },
      include: { publications: true },
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  listDestinations() {
    if (!this.prisma.destination) return [];
    return this.prisma.destination.findMany({
      where: { status: { in: ["published", "active"] } },
      orderBy: { updatedAt: "desc" },
      take: 250
    });
  }
}

module.exports = { SeoBrainRepository };
