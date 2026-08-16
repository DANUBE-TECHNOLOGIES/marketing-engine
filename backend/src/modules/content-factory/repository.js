"use strict";

function pageBlockData(section) {
  const content = section?.content && typeof section.content === "object"
    ? section.content
    : {};

  return {
    blockType: String(section?.sectionType || "richtext"),
    name: typeof content.title === "string" && content.title.trim()
      ? content.title.trim()
      : null,
    content,
    settings: {},
    seo: {},
    displayOrder: Number.isFinite(Number(section?.displayOrder))
      ? Number(section.displayOrder)
      : 0,
    status: "draft",
    visibleDesktop: true,
    visibleMobile: true,
    version: 1,
  };
}

class ContentFactoryRepository {
  constructor(prisma) { this.prisma = prisma; }

  getDestination(slug) {
    return this.prisma.destination.findUnique({
      where: { slug },
      include: {
        sections: { orderBy: { position: "asc" } },
        faqs: { orderBy: { position: "asc" } },
        themes: { include: { theme: true } },
        travelTypes: { include: { travelType: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  getSite({ siteId, siteSlug }) {
    const where = siteId ? { id: siteId } : { slug: siteSlug };
    return this.prisma.agencySite.findUnique({
      where,
      include: { agency: true, pages: { include: { sections: true, blocks: true } } },
    });
  }

  async persist(site, pages, replace) {
    return this.prisma.$transaction(async (tx) => {
      const ids = new Map();

      for (const page of pages) {
        const existing = await tx.agencySitePage.findUnique({
          where: { siteId_slug: { siteId: site.id, slug: page.slug } },
        });

        if (existing && !replace) {
          ids.set(page.slug, existing.id);
          continue;
        }

        const parentId = page.parentSlug ? ids.get(page.parentSlug) || null : null;
        const saved = await tx.agencySitePage.upsert({
          where: { siteId_slug: { siteId: site.id, slug: page.slug } },
          update: {
            parentId,
            title: page.title,
            path: page.path,
            pageType: page.pageType,
            menuTitle: page.menuTitle,
            menuLocation: page.menuLocation,
            displayOrder: page.displayOrder,
            seoTitle: page.seoTitle,
            metaDescription: page.metaDescription,
            h1: page.h1,
            schemaType: page.schemaType,
            status: "draft",
            published: false,
          },
          create: {
            siteId: site.id,
            parentId,
            title: page.title,
            slug: page.slug,
            path: page.path,
            pageType: page.pageType,
            menuTitle: page.menuTitle,
            menuLocation: page.menuLocation,
            displayOrder: page.displayOrder,
            seoTitle: page.seoTitle,
            metaDescription: page.metaDescription,
            h1: page.h1,
            schemaType: page.schemaType,
            status: "draft",
            published: false,
          },
        });

        ids.set(page.slug, saved.id);

        for (const section of page.sections) {
          await tx.agencySiteSection.upsert({
            where: {
              pageId_sectionType: {
                pageId: saved.id,
                sectionType: section.sectionType,
              },
            },
            update: {
              jsonContent: section.content,
              displayOrder: section.displayOrder,
              status: "draft",
            },
            create: {
              pageId: saved.id,
              sectionType: section.sectionType,
              jsonContent: section.content,
              displayOrder: section.displayOrder,
              status: "draft",
            },
          });
        }

        // Website Designer V2 and public-site-read use PageBlock as the public
        // content source. AgencySiteSection is retained above for legacy
        // compatibility, but generated pages must also materialize the same
        // content as V2 blocks or a published page becomes publicly empty.
        if (existing && replace) {
          await tx.pageBlock.deleteMany({ where: { pageId: saved.id } });
        }

        const blocks = page.sections.map(pageBlockData);
        if (blocks.length) {
          await tx.pageBlock.createMany({
            data: blocks.map((block) => ({ pageId: saved.id, ...block })),
          });
        }
      }

      return { persisted: pages.length, pageIds: Object.fromEntries(ids) };
    });
  }
}

module.exports = ContentFactoryRepository;
module.exports.pageBlockData = pageBlockData;
