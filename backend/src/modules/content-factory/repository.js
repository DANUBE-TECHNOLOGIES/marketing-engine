"use strict";
class ContentFactoryRepository {
  constructor(prisma) { this.prisma = prisma; }
  getDestination(slug) {
    return this.prisma.destination.findUnique({ where: { slug }, include: { sections: { orderBy: { position: "asc" } }, faqs: { orderBy: { position: "asc" } }, themes: { include: { theme: true } }, travelTypes: { include: { travelType: true } }, tags: { include: { tag: true } } } });
  }
  getSite({ siteId, siteSlug }) {
    const where = siteId ? { id: siteId } : { slug: siteSlug };
    return this.prisma.agencySite.findUnique({ where, include: { agency: true, pages: { include: { sections: true } } } });
  }
  async persist(site, pages, replace) {
    return this.prisma.$transaction(async (tx) => {
      const ids = new Map();
      for (const page of pages) {
        const existing = await tx.agencySitePage.findUnique({ where: { siteId_slug: { siteId: site.id, slug: page.slug } } });
        if (existing && !replace) { ids.set(page.slug, existing.id); continue; }
        const parentId = page.parentSlug ? ids.get(page.parentSlug) || null : null;
        const saved = await tx.agencySitePage.upsert({
          where: { siteId_slug: { siteId: site.id, slug: page.slug } },
          update: { parentId, title: page.title, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menuLocation, displayOrder: page.displayOrder, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft", published: false },
          create: { siteId: site.id, parentId, title: page.title, slug: page.slug, path: page.path, pageType: page.pageType, menuTitle: page.menuTitle, menuLocation: page.menuLocation, displayOrder: page.displayOrder, seoTitle: page.seoTitle, metaDescription: page.metaDescription, h1: page.h1, schemaType: page.schemaType, status: "draft", published: false },
        });
        ids.set(page.slug, saved.id);
        for (const section of page.sections) {
          await tx.agencySiteSection.upsert({
            where: { pageId_sectionType: { pageId: saved.id, sectionType: section.sectionType } },
            update: { jsonContent: section.content, displayOrder: section.displayOrder, status: "draft" },
            create: { pageId: saved.id, sectionType: section.sectionType, jsonContent: section.content, displayOrder: section.displayOrder, status: "draft" },
          });
        }
      }
      return { persisted: pages.length, pageIds: Object.fromEntries(ids) };
    });
  }
}
module.exports = ContentFactoryRepository;
