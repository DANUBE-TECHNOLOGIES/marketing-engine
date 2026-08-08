"use strict";

class PageBuilderPersistenceRepository {
  constructor(prisma, tenantId) {
    this.prisma = prisma;
    this.tenantId = tenantId;
  }

  pageWhere(agencyId, slug) {
    return {
      slug,
      site: {
        is: {
          agencyId: Number(agencyId),
          tenantId: this.tenantId,
        },
      },
    };
  }

  findPage(agencyId, slug) {
    return this.prisma.agencySitePage.findFirst({
      where: this.pageWhere(agencyId, slug),
      include: {
        site: true,
        blocks: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });
  }

  findPageById(pageId) {
    return this.prisma.agencySitePage.findFirst({
      where: {
        id: pageId,
        site: {
          tenantId: this.tenantId,
        },
      },
      include: {
        site: true,
        blocks: {
          orderBy: {
            displayOrder: "asc",
          },
        },
      },
    });
  }

  async nextVersion(tx, pageId) {
    const aggregate =
      await tx.agencySitePageVersion.aggregate({
        where: { pageId },
        _max: {
          version: true,
        },
      });

    return (aggregate._max.version || 0) + 1;
  }

  serializePage(page) {
    return {
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status,
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
        published: page.published,
      },

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
        where: {
          id: page.id,
        },
        data: {
          title: input.page.title,
          slug: input.page.slug,
          status: input.page.status,
          seoTitle: input.page.seoTitle,
          metaDescription: input.page.metaDescription,
          published: input.page.published,
        },
      });

      /*
       * Le Designer V2 porte l'intention de publication de la page.
       * Le renderer public exige également que l'AgencySite soit publié.
       * Dès qu'une page est publiée, on ouvre donc le site au contrat
       * public. Une page repassée en brouillon ne dépublie pas le site :
       * les autres pages publiées doivent rester accessibles.
       */
      if (input.page.published === true) {
        await tx.agencySite.updateMany({
          where: {
            id: page.siteId,
            ...(this.tenantId
              ? { tenantId: this.tenantId }
              : {}),
            status: {
              not: "published",
            },
          },
          data: {
            status: "published",
            publishedAt: new Date(),
          },
        });
      }

      await tx.pageBlock.deleteMany({
        where: {
          pageId: page.id,
        },
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
            displayOrder: index,
            status: block.status,
            visibleDesktop:
              block.visibleDesktop !== false,
            visibleMobile:
              block.visibleMobile !== false,
            version: 1,
          })),
        });
      }

      const saved =
        await tx.agencySitePage.findUnique({
          where: {
            id: page.id,
          },
          include: {
            site: true,
            blocks: {
              orderBy: {
                displayOrder: "asc",
              },
            },
          },
        });

      const version = await this.nextVersion(
        tx,
        page.id
      );

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
      orderBy: {
        version: "desc",
      },
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
  async findHomePage(
    agencyId
  ) {
    const normalizedAgencyId =
      Number(agencyId);

    if (
      !Number.isInteger(
        normalizedAgencyId
      )
    ) {
      return null;
    }

    const siteFilter = {
      agencyId:
        normalizedAgencyId,
    };

    if (this.tenantId) {
      siteFilter.tenantId =
        this.tenantId;
    }

    /*
     * L’accueil est identifié par sa position fonctionnelle.
     * Le slug vide reste le format canonique, mais displayOrder=0
     * permet de retrouver les données même si une ancienne fonction
     * transforme involontairement "" en "accueil".
     */
    const page =
      await this.prisma
        .agencySitePage
        .findFirst({
          where: {
            site: {
              is:
                siteFilter,
            },

            displayOrder:
              0,
          },

          include: {
            site: true,
            blocks: {
              orderBy: {
                displayOrder:
                  "asc",
              },
            },
          },
        });

    if (page) {
      return page;
    }

    /*
     * Secours pour les anciennes bases sans ordre correctement
     * initialisé : recherche stricte du slug vide.
     */
    return this.prisma
      .agencySitePage
      .findFirst({
        where: {
          site: {
            is:
              siteFilter,
          },

          slug:
            "",
        },

        include: {
          site: true,
          blocks: {
            orderBy: {
              displayOrder:
                "asc",
            },
          },
        },
      });
  }

}

module.exports = PageBuilderPersistenceRepository;