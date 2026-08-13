"use strict";

class PageBuilderPersistenceRepository {
  constructor(prisma, tenantId) {
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  async findPage(agencyId, slug) {
    const normalizedAgencyId = Number(agencyId);
    if (!Number.isInteger(normalizedAgencyId)) return null;

    return this.prisma.agencySitePage.findFirst({
      where: {
        slug,
        site: {
          tenantId: this.tenantId,
          agencyId: normalizedAgencyId,
        },
      },
      include: {
        site: true,
        blocks: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  }

  serializePage(page) {
    return {
      id: page.id,
      title: page.title,
      slug: page.slug,
      status: page.status,
      seoTitle: page.seoTitle || "",
      seoDescription: page.metaDescription || "",
      metaDescription: page.metaDescription || "",
      published: page.published === true,
      updatedAt: page.updatedAt,
      version: page.version || null,
      blocks: (page.blocks || []).map((block) => ({
        id: block.id,
        type: block.blockType,
        status: block.status,
        position: block.displayOrder,
        content: block.content,
        settings: block.settings,
        seo: block.seo,
        visibleDesktop: block.visibleDesktop,
        visibleMobile: block.visibleMobile,
        version: block.version,
      })),
    };
  }

  async replacePageBlocks(page, input, metadata = {}) {
    return this.prisma.$transaction(async (tx) => {
      await tx.agencySitePage.update({
        where: { id: page.id },
        data: {
          title: input.page.title,
          slug: input.page.slug,
          status: input.page.status,
          seoTitle: input.page.seoTitle,
          metaDescription: input.page.metaDescription,
          published: input.page.published,
        },
      });

      if (input.page.published === true) {
        await tx.agencySite.updateMany({
          where: {
            id: page.siteId,
            ...(this.tenantId ? { tenantId: this.tenantId } : {}),
            status: { not: "published" },
          },
          data: {
            status: "published",
            publishedAt: new Date(),
          },
        });
      }

      await tx.pageBlock.deleteMany({
        where: { pageId: page.id },
      });

      if (input.blocks.length) {
        await tx.pageBlock.createMany({
          data: input.blocks.map((block, index) => ({
            pageId: page.id,
            blockType: block.type,
            name: block.name || null,
            content: block.content,
            settings: block.settings || {},
            seo: block.seo || {},
            displayOrder: Number.isFinite(Number(block.position))
              ? Number(block.position)
              : index,
            status: block.status,
            visibleDesktop: block.visibleDesktop !== false,
            visibleMobile: block.visibleMobile !== false,
            version: 1,
          })),
        });
      }

      const saved = await tx.agencySitePage.findUnique({
        where: { id: page.id },
        include: {
          site: true,
          blocks: {
            orderBy: { displayOrder: "asc" },
          },
        },
      });

      const version = await this.nextVersion(tx, page.id);

      await tx.agencySitePageVersion.create({
        data: {
          pageId: page.id,
          version,
          snapshot: this.serializePage(saved),
          reason: metadata.reason || "manual-save",
          createdBy: metadata.createdBy || null,
        },
      });

      return {
        ...saved,
        version,
      };
    });
  }

  listVersions(pageId) {
    return this.prisma.agencySitePageVersion.findMany({
      where: {
        pageId,
        page: {
          site: {
            tenantId: this.tenantId,
          },
        },
      },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        reason: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  findVersion(pageId, versionId) {
    return this.prisma.agencySitePageVersion.findFirst({
      where: {
        id: versionId,
        pageId,
        page: {
          site: {
            tenantId: this.tenantId,
          },
        },
      },
    });
  }

  async findHomePage(agencyId) {
    const normalizedAgencyId = Number(agencyId);
    if (!Number.isInteger(normalizedAgencyId)) return null;

    return this.prisma.agencySitePage.findFirst({
      where: {
        site: {
          tenantId: this.tenantId,
          agencyId: normalizedAgencyId,
        },
        OR: [{ slug: "home" }, { slug: "" }],
      },
      orderBy: [{ slug: "desc" }, { createdAt: "asc" }],
      include: {
        site: true,
        blocks: {
          orderBy: { displayOrder: "asc" },
        },
      },
    });
  }

  async nextVersion(tx, pageId) {
    const aggregate = await tx.agencySitePageVersion.aggregate({
      where: { pageId },
      _max: { version: true },
    });

    return Number(aggregate?._max?.version || 0) + 1;
  }
}

module.exports = {
  PageBuilderPersistenceRepository,
};
