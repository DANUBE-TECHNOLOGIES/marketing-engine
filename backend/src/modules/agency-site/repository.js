const {
  TenantScopedRepository,
} = require("../tenant-core/scoped-repository");

class AgencySiteRepository extends TenantScopedRepository {
  getAgency(id) {
    return this.prisma.agency.findFirst({
      where: this.scope({ id: Number(id) }),
    });
  }


  listSites() {
    return this.prisma.agencySite.findMany({
      where: {
        tenantId: this.tenantId,
      },
      orderBy: {
        name: "asc",
      },
      include: {
        agency: true,
        pages: {
          orderBy: {
            displayOrder: "asc",
          },
          select: {
            id: true,
            title: true,
            slug: true,
            path: true,
            status: true,
            displayOrder: true,
          },
        },
      },
    });
  }

  findByAgencyId(agencyId) {
    return this.prisma.agencySite.findFirst({
      where: this.scope({
        agencyId: Number(agencyId),
      }),
      include: {
        pages: {
          orderBy: { displayOrder: "asc" },
          include: {
            sections: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });
  }

  async upsertSite(site) {
    const existing =
      await this.prisma.agencySite.findFirst({
        where: this.scope({
          agencyId: Number(site.agencyId),
        }),
        select: { id: true },
      });

    const data = {
      name: site.name,
      slug: site.slug,
      basePath: site.basePath,
      status: site.status,
      theme: site.theme,
      generatedAt: new Date(),
    };

    if (existing) {
      return this.prisma.agencySite.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.agencySite.create({
      data: this.createData({
        ...site,
        agencyId: Number(site.agencyId),
        generatedAt: new Date(),
      }),
    });
  }

  upsertPage(siteId, page, parentId) {
    return this.prisma.agencySitePage.upsert({
      where: {
        siteId_slug: {
          siteId,
          slug: page.slug,
        },
      },
      update: {
        parentId,
        title: page.title,
        path: page.path,
        pageType: page.pageType,
        menuTitle: page.menuTitle,
        menuLocation: page.menu,
        displayOrder: page.order,
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
        h1: page.h1,
        schemaType: page.schemaType,
        status: "draft",
      },
      create: {
        siteId,
        parentId,
        title: page.title,
        slug: page.slug,
        path: page.path,
        pageType: page.pageType,
        menuTitle: page.menuTitle,
        menuLocation: page.menu,
        displayOrder: page.order,
        seoTitle: page.seoTitle,
        metaDescription: page.metaDescription,
        h1: page.h1,
        schemaType: page.schemaType,
        status: "draft",
      },
    });
  }

  upsertSection(pageId, section) {
    return this.prisma.agencySiteSection.upsert({
      where: {
        pageId_sectionType: {
          pageId,
          sectionType: section.sectionType,
        },
      },
      update: {
        jsonContent: section.content,
        displayOrder: section.displayOrder,
        status: "draft",
      },
      create: {
        pageId,
        sectionType: section.sectionType,
        jsonContent: section.content,
        displayOrder: section.displayOrder,
        status: "draft",
      },
    });
  }

  async createSectionIfMissing(
    pageId,
    section
  ) {
    const normalizedPageId =
      String(
        pageId ||
        ""
      ).trim();

    const sectionType =
      String(
        section?.sectionType ||
        ""
      ).trim();

    if (
      !normalizedPageId ||
      !sectionType
    ) {
      const error =
        new Error(
          "pageId et sectionType sont obligatoires."
        );

      error.statusCode =
        400;

      error.code =
        "INVALID_SECTION_CREATE";

      throw error;
    }

    /*
     * Isolation tenant :
     * on certifie d'abord que la page appartient
     * bien à un site du tenant courant.
     */
    const page =
      await this.prisma
        .agencySitePage
        .findFirst({
          where: {
            id:
              normalizedPageId,

            site: {
              tenantId:
                this.tenantId,
            },
          },

          select: {
            id:
              true,
          },
        });

    if (!page) {
      const error =
        new Error(
          `Page ${normalizedPageId} introuvable pour ce tenant.`
        );

      error.statusCode =
        404;

      error.code =
        "AGENCY_SITE_PAGE_NOT_FOUND";

      throw error;
    }

    const uniqueWhere = {
      pageId_sectionType: {
        pageId:
          normalizedPageId,

        sectionType,
      },
    };

    const existing =
      await this.prisma
        .agencySiteSection
        .findUnique({
          where:
            uniqueWhere,
        });

    if (existing) {
      return {
        created:
          false,

        reason:
          "SECTION_ALREADY_EXISTS",

        section:
          existing,
      };
    }

    try {
      const created =
        await this.prisma
          .agencySiteSection
          .create({
            data: {
              pageId:
                normalizedPageId,

              sectionType,

              jsonContent:
                section.content ??
                {},

              displayOrder:
                Number(
                  section.displayOrder ||
                  0
                ),

              status:
                "draft",
            },
          });

      return {
        created:
          true,

        reason:
          "SECTION_CREATED",

        section:
          created,
      };
    } catch (error) {
      /*
       * Protection concurrence :
       * si une autre exécution crée la même section
       * entre notre lecture et notre create(), on
       * conserve la section concurrente et on ne fait
       * jamais d'UPDATE.
       */
      if (
        error?.code ===
        "P2002"
      ) {
        const concurrent =
          await this.prisma
            .agencySiteSection
            .findUnique({
              where:
                uniqueWhere,
            });

        return {
          created:
            false,

          reason:
            "SECTION_CREATED_CONCURRENTLY",

          section:
            concurrent,
        };
      }

      throw error;
    }
  }

  deletePages(siteId) {
    return this.prisma.agencySitePage.deleteMany({
      where: {
        siteId,
        site: {
          tenantId: this.tenantId,
        },
      },
    });
  }

  deleteSectionsForSite(siteId) {
    return this.prisma.agencySiteSection.deleteMany({
      where: {
        page: {
          siteId,
          site: {
            tenantId: this.tenantId,
          },
        },
      },
    });
  }

  findPublicSite(siteSlug) {
    return this.prisma.agencySite.findFirst({
      where: this.scope({ slug: siteSlug }),
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            city: true,
            address: true,
            postalCode: true,
            phone: true,
            email: true,
            website: true,
            googleReviewUrl: true,
            googleLocationId: true,
          },
        },
        pages: {
          orderBy: { displayOrder: "asc" },
          include: {
            sections: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    });
  }

  findPublicPage(siteSlug, slug) {
    return this.prisma.agencySitePage.findFirst({
      where: {
        site: {
          is: this.scope({
            slug: siteSlug,
          }),
        },
        slug,
      },
      include: {
        sections: {
          orderBy: { displayOrder: "asc" },
        },
        site: {
          include: {
            agency: {
              select: {
                id: true,
                name: true,
                city: true,
                address: true,
                postalCode: true,
                phone: true,
                email: true,
                website: true,
                googleReviewUrl: true,
                googleLocationId: true,
              },
            },
          },
        },
      },
    });
  }

  findPage(agencyId, slug) {
    const normalizedAgencyId = Number(agencyId);

    if (!Number.isInteger(normalizedAgencyId)) {
      return null;
    }

    return this.prisma.agencySitePage.findFirst({
      where: {
        site: {
          is: {
            agencyId: normalizedAgencyId,
            tenantId: this.tenantId,
          },
        },
        slug,
      },
      include: {
        sections: {
          orderBy: {
            displayOrder: "asc",
          },
        },
        site: true,
      },
    });
  }

  async replacePageSections(pageId, sections) {
    const page =
      await this.prisma.agencySitePage.findFirst({
        where: {
          id: pageId,
          site: {
            tenantId: this.tenantId,
          },
        },
        select: {
          id: true,
        },
      });

    if (!page) {
      return null;
    }

    /*
     * Prisma impose une unicité sur :
     * pageId + sectionType.
     *
     * Le Website Builder autorise plusieurs blocs du même type.
     * Nous générons donc une clé technique unique tout en conservant
     * le véritable type dans jsonContent.__builderType.
     */
    const typeCounts = new Map();

    const normalizedSections = sections.map((section, index) => {
      const baseType = String(
        section.jsonContent?.__builderType ||
        section.sectionType ||
        "section"
      )
        .replace(/--\d+$/, "")
        .trim();

      const count = (typeCounts.get(baseType) || 0) + 1;
      typeCounts.set(baseType, count);

      const uniqueSectionType =
        count === 1
          ? baseType
          : `${baseType}--${count}`;

      return {
        pageId,
        sectionType: uniqueSectionType,
        jsonContent: {
          ...(section.jsonContent || {}),
          __builderType: baseType,
        },
        displayOrder: index,
        status: section.status || "draft",
      };
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.agencySiteSection.deleteMany({
        where: { pageId },
      });

      if (normalizedSections.length > 0) {
        await tx.agencySiteSection.createMany({
          data: normalizedSections,
        });
      }
    });

    return this.prisma.agencySitePage.findUnique({
      where: { id: pageId },
      include: {
        sections: {
          orderBy: { displayOrder: "asc" },
        },
        site: true,
      },
    });
  }
}

module.exports = AgencySiteRepository;
