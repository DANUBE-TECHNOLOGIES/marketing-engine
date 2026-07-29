class MiniSiteRepository {
  constructor(prisma) { this.prisma = prisma; }
  findAll() { return this.prisma.miniSite.findMany({ include: { pages: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }); }
  findById(id) { return this.prisma.miniSite.findUnique({ where: { id }, include: { pages: { orderBy: { createdAt: "asc" } } } }); }
  createWithPages(siteData, pages) { return this.prisma.$transaction(async (tx) => { const site = await tx.miniSite.create({ data: siteData }); await tx.miniSitePage.createMany({ data: pages.map((page) => ({ miniSiteId: site.id, ...page })) }); return tx.miniSite.findUnique({ where: { id: site.id }, include: { pages: { orderBy: { createdAt: "asc" } } } }); }); }
  update(id, data) { return this.prisma.miniSite.update({ where: { id }, data }); }
  delete(id) { return this.prisma.miniSite.delete({ where: { id } }); }
  findPage(id) { return this.prisma.miniSitePage.findUnique({ where: { id } }); }
  listPages(miniSiteId) { return this.prisma.miniSitePage.findMany({ where: { miniSiteId }, orderBy: { createdAt: "asc" } }); }
  createPage(miniSiteId, data) { return this.prisma.miniSitePage.create({ data: { miniSiteId, ...data } }); }
  updatePage(id, data) { return this.prisma.miniSitePage.update({ where: { id }, data }); }
  deletePage(id) { return this.prisma.miniSitePage.delete({ where: { id } }); }
  createPageCluster(miniSiteId, pages, overwrite = false) {
    const slugs = pages.map((page) => page.slug);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.miniSitePage.findMany({ where: { miniSiteId, slug: { in: slugs } }, select: { slug: true } });
      if (existing.length && !overwrite) return { conflictSlugs: existing.map((item) => item.slug), pages: null };
      if (existing.length) await tx.miniSitePage.deleteMany({ where: { miniSiteId, slug: { in: slugs } } });
      await tx.miniSitePage.createMany({ data: pages.map((page) => ({ miniSiteId, ...page })) });
      const created = await tx.miniSitePage.findMany({ where: { miniSiteId, slug: { in: slugs } }, orderBy: { createdAt: "asc" } });
      return { conflictSlugs: [], pages: created };
    });
  }
}
module.exports = MiniSiteRepository;
