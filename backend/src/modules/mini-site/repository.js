const { TenantScopedRepository } = require("../tenant-core/scoped-repository");
class MiniSiteRepository extends TenantScopedRepository {
  findAll() { return this.prisma.miniSite.findMany({ where: this.scope(), include: { pages: { orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" } }); }
  findById(id) { return this.prisma.miniSite.findFirst({ where: this.scope({ id }), include: { pages: { orderBy: { createdAt: "asc" } } } }); }
  createWithPages(siteData, pages) { return this.prisma.$transaction(async (tx) => { const site = await tx.miniSite.create({ data: this.createData(siteData) }); await tx.miniSitePage.createMany({ data: pages.map((page) => ({ miniSiteId: site.id, ...page })) }); return (this.tenantId && tx.miniSite.findFirst ? tx.miniSite.findFirst({ where: { id: site.id, tenantId: this.tenantId }, include: { pages: { orderBy: { createdAt: "asc" } } } }) : tx.miniSite.findUnique({ where: { id: site.id }, include: { pages: { orderBy: { createdAt: "asc" } } } })); }); }
  async update(id, data) { const site = await this.findById(id); if (!site) return null; return this.prisma.miniSite.update({ where: { id }, data }); }
  async delete(id) { const site = await this.findById(id); if (!site) return null; return this.prisma.miniSite.delete({ where: { id } }); }
  findPage(id) { return this.prisma.miniSitePage.findFirst({ where: { id, miniSite: { tenantId: this.tenantId } } }); }
  listPages(miniSiteId) { return this.prisma.miniSitePage.findMany({ where: { miniSiteId, miniSite: { tenantId: this.tenantId } }, orderBy: { createdAt: "asc" } }); }
  createPage(miniSiteId, data) { return this.prisma.miniSitePage.create({ data: { miniSiteId, ...data } }); }
  async updatePage(id, data) { const page = await this.findPage(id); if (!page) return null; return this.prisma.miniSitePage.update({ where: { id }, data }); }
  async deletePage(id) { const page = await this.findPage(id); if (!page) return null; return this.prisma.miniSitePage.delete({ where: { id } }); }
  createPageCluster(miniSiteId, pages, overwrite = false) {
    const slugs = pages.map((page) => page.slug);
    return this.prisma.$transaction(async (tx) => {
      const site = await tx.miniSite.findFirst({ where: { id: miniSiteId, tenantId: this.tenantId }, select: { id: true } });
      if (!site) throw Object.assign(new Error("Mini-site introuvable pour ce tenant"), { statusCode: 404 });
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
