class AgencySiteRepository {
  constructor(prisma) { this.prisma = prisma; }
  getAgency(id) { return this.prisma.agency.findUnique({ where: { id: Number(id) } }); }
  findByAgencyId(agencyId) {
    return this.prisma.agencySite.findUnique({ where: { agencyId: Number(agencyId) }, include: { pages: { orderBy: { displayOrder: "asc" } } } });
  }
  async upsertSite(site) {
    return this.prisma.agencySite.upsert({
      where: { agencyId: Number(site.agencyId) },
      update: { name: site.name, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme, generatedAt: new Date() },
      create: { ...site, agencyId: Number(site.agencyId), generatedAt: new Date() }
    });
  }
  upsertPage(siteId, page, parentId) {
    return this.prisma.agencySitePage.upsert({
      where: { siteId_slug: { siteId, slug: page.slug } },
      update: { parentId, title: page.title, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menu, displayOrder: page.order, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft" },
      create: { siteId, parentId, title: page.title, slug: page.slug, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menu, displayOrder: page.order, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft" }
    });
  }
  deletePages(siteId) { return this.prisma.agencySitePage.deleteMany({ where: { siteId } }); }
}
module.exports = AgencySiteRepository;
