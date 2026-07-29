class AgencySiteRepository {
  constructor(prisma) { this.prisma = prisma; }
  getAgency(id) { return this.prisma.agency.findUnique({ where: { id: Number(id) } }); }
  findByAgencyId(agencyId) {
    return this.prisma.agencySite.findUnique({ where: { agencyId: Number(agencyId) }, include: { pages: { orderBy: { displayOrder: "asc" }, include: { sections: { orderBy: { displayOrder: "asc" } } } } } });
  }
  async upsertSite(site) {
    return this.prisma.agencySite.upsert({ where: { agencyId: Number(site.agencyId) }, update: { name: site.name, slug: site.slug, basePath: site.basePath, status: site.status, theme: site.theme, generatedAt: new Date() }, create: { ...site, agencyId: Number(site.agencyId), generatedAt: new Date() } });
  }
  upsertPage(siteId, page, parentId) {
    return this.prisma.agencySitePage.upsert({ where: { siteId_slug: { siteId, slug: page.slug } }, update: { parentId, title: page.title, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menu, displayOrder: page.order, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft" }, create: { siteId, parentId, title: page.title, slug: page.slug, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menu, displayOrder: page.order, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft" } });
  }
  upsertSection(pageId, section) {
    return this.prisma.agencySiteSection.upsert({ where: { pageId_sectionType: { pageId, sectionType: section.sectionType } }, update: { jsonContent: section.content, displayOrder: section.displayOrder, status: "draft" }, create: { pageId, sectionType: section.sectionType, jsonContent: section.content, displayOrder: section.displayOrder, status: "draft" } });
  }
  deletePages(siteId) { return this.prisma.agencySitePage.deleteMany({ where: { siteId } }); }
  deleteSectionsForSite(siteId) { return this.prisma.agencySiteSection.deleteMany({ where: { page: { siteId } } }); }
  findPublicSite(siteSlug) {
    return this.prisma.agencySite.findUnique({ where: { slug: siteSlug }, include: { pages: { orderBy: { displayOrder: "asc" }, include: { sections: { orderBy: { displayOrder: "asc" } } } } } });
  }
  findPublicPage(siteSlug, slug) {
    return this.prisma.agencySitePage.findFirst({ where: { site: { slug: siteSlug }, slug }, include: { sections: { orderBy: { displayOrder: "asc" } }, site: true } });
  }
  findPage(agencyId, slug) {
    return this.prisma.agencySitePage.findFirst({ where: { site: { agencyId: Number(agencyId) }, slug }, include: { sections: { orderBy: { displayOrder: "asc" } }, site: true } });
  }
}
module.exports = AgencySiteRepository;
