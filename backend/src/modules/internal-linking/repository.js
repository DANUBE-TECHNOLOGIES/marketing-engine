"use strict";

const destinationInclude = {
  themes: { include: { theme: true } },
  travelTypes: { include: { travelType: true } },
  tags: { include: { tag: true } },
  relationsFrom: true,
  relationsTo: true
};

class InternalLinkingRepository {
  constructor(prisma) { this.prisma = prisma; }

  findDestinationBySlug(slug) {
    return this.prisma.destination.findUnique({ where: { slug }, include: destinationInclude });
  }

  findDestinationById(id) {
    return this.prisma.destination.findUnique({ where: { id }, include: destinationInclude });
  }

  listDestinations(options = {}) {
    return this.prisma.destination.findMany({
      where: options.includeDrafts ? {} : { status: "published" },
      include: destinationInclude,
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
    });
  }

  findPage(pageId) {
    return this.prisma.agencySitePage.findUnique({
      where: { id: pageId },
      include: { site: true, sections: { orderBy: { displayOrder: "asc" } } }
    });
  }

  listSitePages(siteId) {
    return this.prisma.agencySitePage.findMany({
      where: { siteId },
      include: { sections: { orderBy: { displayOrder: "asc" } } },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }]
    });
  }

  upsertComputedRelation(sourceId, targetId, score, metadata) {
    return this.prisma.destinationRelation.upsert({
      where: { sourceId_targetId_relationType: { sourceId, targetId, relationType: "internal_link" } },
      update: { score, origin: "internal-linking-engine", metadata },
      create: { sourceId, targetId, relationType: "internal_link", score, origin: "internal-linking-engine", metadata }
    });
  }

  deleteComputedRelations(sourceId) {
    return this.prisma.destinationRelation.deleteMany({
      where: { sourceId, relationType: "internal_link", origin: "internal-linking-engine" }
    });
  }
}

module.exports = { InternalLinkingRepository, destinationInclude };
