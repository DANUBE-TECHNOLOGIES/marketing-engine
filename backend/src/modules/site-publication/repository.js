"use strict";

const {
  sitePublicationError,
} = require("./errors");

class SitePublicationRepository {
  constructor({ prisma }) {
    this.prisma = prisma;
  }

  async site(siteId) {
    const site = await this.prisma.agencySite.findUnique({
      where: { id: String(siteId) },
      include: {
        agency: {
          select: { id: true, name: true },
        },
        pages: {
          orderBy: [
            { displayOrder: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            id: true,
            slug: true,
            title: true,
            status: true,
            published: true,
            displayOrder: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!site) {
      throw sitePublicationError(
        "SITE_NOT_FOUND",
        "Le mini-site demandé est introuvable.",
        404,
        { siteId }
      );
    }

    return site;
  }

  async markPagePublished({ siteId, pageId }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const page = await tx.agencySitePage.updateMany({
        where: {
          id: String(pageId),
          siteId: String(siteId),
        },
        data: {
          status: "published",
          published: true,
        },
      });

      if (page.count !== 1) {
        throw sitePublicationError(
          "PAGE_NOT_FOUND",
          "La page demandée est introuvable dans ce mini-site.",
          404,
          { siteId, pageId }
        );
      }

      const blocks = tx.pageBlock
        ? await tx.pageBlock.updateMany({
            where: {
              pageId: String(pageId),
              status: { not: "hidden" },
            },
            data: { status: "published" },
          })
        : { count: 0 };

      const sections = tx.agencySiteSection
        ? await tx.agencySiteSection.updateMany({
            where: {
              pageId: String(pageId),
              status: { not: "hidden" },
            },
            data: { status: "published" },
          })
        : { count: 0 };

      return {
        pageCount: page.count,
        blockCount: blocks.count,
        sectionCount: sections.count,
      };
    });

    return {
      pageId: String(pageId),
      siteId: String(siteId),
      status: "published",
      published: true,
      blocksPublished: result.blockCount,
      sectionsPublished: result.sectionCount,
    };
  }

  async markPageUnpublished({ siteId, pageId }) {
    const result = await this.prisma.$transaction(async (tx) => {
      const page = await tx.agencySitePage.updateMany({
        where: {
          id: String(pageId),
          siteId: String(siteId),
        },
        data: {
          status: "draft",
          published: false,
        },
      });

      if (page.count !== 1) {
        throw sitePublicationError(
          "PAGE_NOT_FOUND",
          "La page demandée est introuvable dans ce mini-site.",
          404,
          { siteId, pageId }
        );
      }

      const blocks = tx.pageBlock
        ? await tx.pageBlock.updateMany({
            where: {
              pageId: String(pageId),
              status: "published",
            },
            data: { status: "draft" },
          })
        : { count: 0 };

      const sections = tx.agencySiteSection
        ? await tx.agencySiteSection.updateMany({
            where: {
              pageId: String(pageId),
              status: "published",
            },
            data: { status: "draft" },
          })
        : { count: 0 };

      return {
        pageCount: page.count,
        blockCount: blocks.count,
        sectionCount: sections.count,
      };
    });

    return {
      pageId: String(pageId),
      siteId: String(siteId),
      status: "draft",
      published: false,
      blocksUnpublished: result.blockCount,
      sectionsUnpublished: result.sectionCount,
    };
  }

  async status(siteId) {
    const site = await this.site(siteId);

    const publishedPages = site.pages.filter(
      (page) =>
        page.published ||
        String(page.status || "").toLowerCase() === "published"
    );

    return {
      site: {
        id: site.id,
        slug: site.slug,
        name: site.name,
        status: site.status,
        publishedAt: site.publishedAt,
        agency: site.agency,
      },
      pages: {
        total: site.pages.length,
        published: publishedPages.length,
        unpublished: site.pages.length - publishedPages.length,
        items: site.pages,
      },
      fullyPublished:
        site.pages.length > 0 &&
        publishedPages.length === site.pages.length,
    };
  }

  async markSitePublished(siteId) {
    return this.prisma.agencySite.update({
      where: { id: String(siteId) },
      data: {
        status: "published",
        publishedAt: new Date(),
      },
    });
  }

  async markSiteUnpublished(siteId) {
    return this.prisma.agencySite.update({
      where: { id: String(siteId) },
      data: {
        status: "draft",
        publishedAt: null,
      },
    });
  }
}

module.exports = {
  SitePublicationRepository,
};