"use strict";

const {
  sitePublicationError,
} =
  require(
    "./errors"
  );

class SitePublicationRepository {
  constructor({
    prisma,
  }) {
    this.prisma =
      prisma;
  }

  async site(
    siteId
  ) {
    const site =
      await this.prisma
        .agencySite
        .findUnique({
          where: {
            id:
              String(siteId),
          },

          include: {
            agency: {
              select: {
                id:
                  true,

                name:
                  true,
              },
            },

            pages: {
              orderBy: [
                {
                  displayOrder:
                    "asc",
                },

                {
                  createdAt:
                    "asc",
                },
              ],

              select: {
                id:
                  true,

                slug:
                  true,

                title:
                  true,

                status:
                  true,

                published:
                  true,

                displayOrder:
                  true,

                updatedAt:
                  true,
              },
            },
          },
        });

    if (!site) {
      throw sitePublicationError(
        "SITE_NOT_FOUND",
        "Le mini-site demandé est introuvable.",
        404,
        {
          siteId,
        }
      );
    }

    return site;
  }

  async status(
    siteId
  ) {
    const site =
      await this.site(
        siteId
      );

    const publishedPages =
      site.pages.filter(
        (page) =>
          page.published ||
          String(
            page.status || ""
          ).toLowerCase() ===
            "published"
      );

    return {
      site: {
        id:
          site.id,

        slug:
          site.slug,

        name:
          site.name,

        status:
          site.status,

        publishedAt:
          site.publishedAt,

        agency:
          site.agency,
      },

      pages: {
        total:
          site.pages.length,

        published:
          publishedPages.length,

        unpublished:
          site.pages.length -
          publishedPages.length,

        items:
          site.pages,
      },

      fullyPublished:
        site.pages.length > 0 &&
        publishedPages.length ===
          site.pages.length,
    };
  }

  async markSitePublished(
    siteId
  ) {
    return this.prisma
      .agencySite
      .update({
        where: {
          id:
            String(siteId),
        },

        data: {
          status:
            "published",

          publishedAt:
            new Date(),
        },
      });
  }

  async markSiteUnpublished(
    siteId
  ) {
    return this.prisma
      .agencySite
      .update({
        where: {
          id:
            String(siteId),
        },

        data: {
          status:
            "draft",

          publishedAt:
            null,
        },
      });
  }
}

module.exports = {
  SitePublicationRepository,
};
