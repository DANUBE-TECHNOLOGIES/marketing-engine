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
      include: { pages: { include: { sections: { orderBy: { displayOrder: "asc" } } }, orderBy: { displayOrder: "asc" } } }
    });
  }

  listSites() {
    return this.prisma.agencySite.findMany({
      include: { pages: { include: { sections: true } } },
      orderBy: { updatedAt: "desc" }
    });
  }
}

module.exports = { SeoBrainRepository };
