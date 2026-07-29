class SeoFactoryRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  getAgency(id) {
    return this.prisma.agency.findUnique({ where: { id } });
  }

  getSite(id) {
    return this.prisma.miniSite.findUnique({
      where: { id },
      include: { pages: true },
    });
  }

  async persistPages(siteId, pages) {
    return this.prisma.$transaction(
      pages.map((page) =>
        this.prisma.miniSitePage.upsert({
          where: { miniSiteId_slug: { miniSiteId: siteId, slug: page.slug } },
          update: {
            title: page.title,
            type: page.type,
            seoTitle: page.seoTitle,
            seoDesc: page.seoDesc,
            content: page.content,
          },
          create: {
            miniSiteId: siteId,
            title: page.title,
            slug: page.slug,
            type: page.type,
            seoTitle: page.seoTitle,
            seoDesc: page.seoDesc,
            content: page.content,
          },
        })
      )
    );
  }
}

module.exports = SeoFactoryRepository;
