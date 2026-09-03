"use strict";
class SeoIntelligenceRepository {
  constructor(prisma) { this.prisma = prisma; }
  findPage(id) { return this.prisma.agencySitePage.findUnique({ where: { id }, include: { site: true, sections: { orderBy: { displayOrder: "asc" } } } }); }
  findSite(id) { return this.prisma.agencySite.findUnique({ where: { id }, include: { pages: { orderBy: { displayOrder: "asc" }, include: { site: true, sections: { orderBy: { displayOrder: "asc" } } } } } }); }
}
module.exports = SeoIntelligenceRepository;
