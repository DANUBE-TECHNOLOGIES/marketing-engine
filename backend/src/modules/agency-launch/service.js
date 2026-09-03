"use strict";

function normalizeStatus(
  value
) {
  return String(
    value ||
    ""
  )
    .trim()
    .toLowerCase();
}

function isPublished(
  record
) {
  if (!record) {
    return false;
  }

  if (
    record.published ===
    true
  ) {
    return true;
  }

  if (
    record.publishedAt
  ) {
    return true;
  }

  return [
    "published",
    "online",
    "live",
    "active",
  ].includes(
    normalizeStatus(
      record.status
    )
  );
}

function pageBySlug(
  pages,
  slug
) {
  return (
    pages.find(
      (page) =>
        String(
          page.slug ||
          ""
        )
          .trim()
          .toLowerCase() ===
        slug
    ) ||
    null
  );
}

function pageCheck({
  pages,
  slug,
  label,
  required,
}) {
  const page =
    pageBySlug(
      pages,
      slug
    );

  return {
    code:
      `PAGE_${slug.toUpperCase().replace(/-/g, "_")}`,

    label,

    required,

    exists:
      Boolean(
        page
      ),

    published:
      isPublished(
        page
      ),

    passed:
      Boolean(
        page &&
        isPublished(
          page
        )
      ),

    pageId:
      page?.id ||
      null,

    slug,
  };
}


function resolveLaunchState({
  site,
  readiness,
} = {}) {
  if (!site) {
    return {
      code:
        "to_prepare",

      label:
        "À préparer",

      priority:
        1,

      actionable:
        true,

      action:
        "prepare",
    };
  }

  const published =
    site.status === "published" ||
    site.published === true ||
    Boolean(
      site.publishedAt
    );

  if (published) {
    return {
      code:
        "online",

      label:
        "En ligne",

      priority:
        4,

      actionable:
        false,

      action:
        "view",
    };
  }

  const ready =
    readiness?.ready === true ||
    readiness?.fullyReady === true ||
    readiness?.fullyPublished === true ||
    (
      typeof readiness?.score ===
        "number" &&
      readiness.score >=
        100 &&
      (
        !Array.isArray(
          readiness?.blockers
        ) ||
        readiness.blockers.length ===
          0
      )
    );

  if (ready) {
    return {
      code:
        "ready_to_publish",

      label:
        "Prêt à publier",

      priority:
        3,

      actionable:
        true,

      action:
        "publish",
    };
  }

  return {
    code:
      "to_complete",

    label:
      "À compléter",

    priority:
      2,

    actionable:
      true,

    action:
      "complete",
  };
}

function summarizeLaunchStates(
  items = []
) {
  const summary = {
    total:
      items.length,

    toPrepare:
      0,

    toComplete:
      0,

    readyToPublish:
      0,

    online:
      0,
  };

  for (const item of items) {
    switch (
      item?.launchState?.code
    ) {
      case "to_prepare":
        summary.toPrepare +=
          1;
        break;

      case "to_complete":
        summary.toComplete +=
          1;
        break;

      case "ready_to_publish":
        summary.readyToPublish +=
          1;
        break;

      case "online":
        summary.online +=
          1;
        break;

      default:
        break;
    }
  }

  return summary;
}

class AgencyLaunchService {
  async networkStates() {
    const agencies =
      await this.prisma.agency.findMany({
        where: {
          tenantId:
            this.tenantId,
        },

        orderBy: [
          {
            city:
              "asc",
          },
          {
            name:
              "asc",
          },
        ],

        select: {
          id:
            true,

          name:
            true,

          city:
            true,

          tenantId:
            true,

          agencySites: {
            orderBy: {
              createdAt:
                "desc",
            },

            take:
              1,

            select: {
              id:
                true,

              slug:
                true,

              status:
                true,

              publishedAt:
                true,
            },
          },
        },
      });

    const items =
      [];

    for (const agency of agencies) {
      const site =
        agency.agencySites?.[0] ||
        null;

      let readiness =
        null;

      if (site) {
        try {
          readiness =
            await this.readiness(
              agency.id
            );
        } catch (error) {
          readiness = {
            ready:
              false,

            error: {
              code:
                error.code ||
                "READINESS_ERROR",

              message:
                error.message,
            },
          };
        }
      }

      const launchState =
        resolveLaunchState({
          site,
          readiness,
        });

      items.push({
        agency: {
          id:
            agency.id,

          name:
            agency.name,

          city:
            agency.city,
        },

        site,

        readiness,

        launchState,
      });
    }

    return {
      generatedAt:
        new Date()
          .toISOString(),

      summary:
        summarizeLaunchStates(
          items
        ),

      items,
    };
  }


  constructor({
    prisma,
  } = {}) {
    if (!prisma) {
      throw new Error(
        "Le client Prisma est obligatoire."
      );
    }

    this.prisma =
      prisma;
  }

  async loadAgency(
    agencyId
  ) {
    const id =
      Number(
        agencyId
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      const error =
        new Error(
          "Identifiant agence invalide."
        );

      error.code =
        "AGENCY_LAUNCH_INVALID_AGENCY_ID";

      error.statusCode =
        400;

      throw error;
    }

    const agency =
      await this.prisma
        .agency
        .findUnique({
          where: {
            id,
          },

          select: {
            id:
              true,

            name:
              true,

            city:
              true,

            address:
              true,

            postalCode:
              true,

            phone:
              true,

            email:
              true,

            tenantId:
              true,
          },
        });

    if (!agency) {
      const error =
        new Error(
          "Agence introuvable."
        );

      error.code =
        "AGENCY_LAUNCH_AGENCY_NOT_FOUND";

      error.statusCode =
        404;

      throw error;
    }

    return agency;
  }

  async loadSite(
    agencyId
  ) {
    return this.prisma
      .agencySite
      .findUnique({
        where: {
          agencyId:
            Number(
              agencyId
            ),
        },

        select: {
          id:
            true,

          agencyId:
            true,

          tenantId:
            true,

          name:
            true,

          slug:
            true,

          basePath:
            true,

          status:
            true,

          publishedAt:
            true,

          theme:
            true,

          generatedAt:
            true,

          createdAt:
            true,

          updatedAt:
            true,

          pages: {
            orderBy: {
              displayOrder:
                "asc",
            },

            select: {
              id:
                true,

              slug:
                true,

              title:
                true,

              pageType:
                true,

              path:
                true,

              status:
                true,

              published:
                true,

              seoTitle:
                true,

              metaDescription:
                true,

              displayOrder:
                true,

              sections: {
                select: {
                  id:
                    true,

                  sectionType:
                    true,

                  status:
                    true,
                },
              },

              blocks: {
                select: {
                  id:
                    true,

                  blockType:
                    true,

                  status:
                    true,

                  visibleDesktop:
                    true,

                  visibleMobile:
                    true,
                },
              },
            },
          },
        },
      });
  }

  identityCheck(
    agency
  ) {
    const fields = {
      name:
        Boolean(
          agency.name
        ),

      city:
        Boolean(
          agency.city
        ),

      address:
        Boolean(
          agency.address
        ),

      postalCode:
        Boolean(
          agency.postalCode
        ),

      phone:
        Boolean(
          agency.phone
        ),

      email:
        Boolean(
          agency.email
        ),
    };

    const missing =
      Object.entries(
        fields
      )
        .filter(
          (
            [
              ,
              present,
            ]
          ) =>
            !present
        )
        .map(
          (
            [
              name,
            ]
          ) =>
            name
        );

    return {
      code:
        "IDENTITY",

      label:
        "Identité de l'agence",

      required:
        true,

      passed:
        missing.length ===
        0,

      fields,

      missing,
    };
  }

  contentCheck(
    site
  ) {
    const pages =
      site?.pages ||
      [];

    const requiredPages = [
      pageCheck({
        pages,
        slug:
          "home",
        label:
          "Accueil",
        required:
          true,
      }),

      pageCheck({
        pages,
        slug:
          "agence",
        label:
          "Présentation de l'agence",
        required:
          true,
      }),

      pageCheck({
        pages,
        slug:
          "services",
        label:
          "Services",
        required:
          true,
      }),

      pageCheck({
        pages,
        slug:
          "contact",
        label:
          "Contact",
        required:
          true,
      }),
    ];

    const recommendedPages = [
      pageCheck({
        pages,
        slug:
          "equipe",
        label:
          "Équipe",
        required:
          false,
      }),

      pageCheck({
        pages,
        slug:
          "engagements",
        label:
          "Engagements",
        required:
          false,
      }),

      pageCheck({
        pages,
        slug:
          "partenaires",
        label:
          "Partenaires",
        required:
          false,
      }),

      pageCheck({
        pages,
        slug:
          "avis",
        label:
          "Avis clients",
        required:
          false,
      }),
    ];

    const requiredPassed =
      requiredPages.filter(
        (item) =>
          item.passed
      ).length;

    const recommendedPassed =
      recommendedPages.filter(
        (item) =>
          item.passed
      ).length;

    return {
      code:
        "GENERAL_CONTENT",

      label:
        "Pages générales",

      required:
        true,

      passed:
        requiredPassed ===
        requiredPages.length,

      requiredPages,

      recommendedPages,

      requiredPassed,

      requiredTotal:
        requiredPages.length,

      recommendedPassed,

      recommendedTotal:
        recommendedPages.length,
    };
  }

  legalCheck(
    site
  ) {
    const pages =
      site?.pages ||
      [];

    const items = [
      pageCheck({
        pages,
        slug:
          "mentions-legales",
        label:
          "Mentions légales",
        required:
          true,
      }),

      pageCheck({
        pages,
        slug:
          "confidentialite",
        label:
          "Politique de confidentialité",
        required:
          true,
      }),
    ];

    return {
      code:
        "LEGAL",

      label:
        "Informations légales",

      required:
        true,

      passed:
        items.every(
          (item) =>
            item.passed
        ),

      items,
    };
  }

  seoCheck(
    site
  ) {
    const pages =
      site?.pages ||
      [];

    const publicPages =
      pages.filter(
        isPublished
      );

    const missingSeoTitle =
      publicPages.filter(
        (page) =>
          !String(
            page.seoTitle ||
            ""
          ).trim()
      );

    const missingDescription =
      publicPages.filter(
        (page) =>
          !String(
            page.metaDescription ||
            ""
          ).trim()
      );

    return {
      code:
        "SEO",

      label:
        "SEO de base",

      required:
        true,

      passed:
        publicPages.length >
          0 &&
        missingSeoTitle.length ===
          0 &&
        missingDescription.length ===
          0,

      publishedPages:
        publicPages.length,

      missingSeoTitle:
        missingSeoTitle.map(
          (page) => ({
            id:
              page.id,

            slug:
              page.slug,
          })
        ),

      missingDescription:
        missingDescription.map(
          (page) => ({
            id:
              page.id,

            slug:
              page.slug,
          })
        ),
    };
  }

  siteCheck(
    site
  ) {
    return {
      code:
        "SITE",

      label:
        "Mini-site",

      required:
        true,

      passed:
        Boolean(
          site
        ),

      exists:
        Boolean(
          site
        ),

      siteId:
        site?.id ||
        null,

      slug:
        site?.slug ||
        null,

      status:
        site?.status ||
        null,

      published:
        isPublished(
          site
        ),
    };
  }

  score(
    checks
  ) {
    const weights = {
      SITE:
        15,

      IDENTITY:
        20,

      GENERAL_CONTENT:
        30,

      LEGAL:
        15,

      SEO:
        20,
    };

    let score =
      0;

    for (
      const check
      of checks
    ) {
      if (
        check.passed
      ) {
        score +=
          weights[
            check.code
          ] ||
          0;
      }
    }

    return score;
  }

  blockers(
    checks
  ) {
    return checks
      .filter(
        (check) =>
          check.required &&
          !check.passed
      )
      .map(
        (check) => ({
          code:
            check.code,

          label:
            check.label,
        })
      );
  }

  async readiness(
    agencyId
  ) {
    const agency =
      await this.loadAgency(
        agencyId
      );

    const site =
      await this.loadSite(
        agency.id
      );

    const checks = [
      this.siteCheck(
        site
      ),

      this.identityCheck(
        agency
      ),

      this.contentCheck(
        site
      ),

      this.legalCheck(
        site
      ),

      this.seoCheck(
        site
      ),
    ];

    const blockers =
      this.blockers(
        checks
      );

    const score =
      this.score(
        checks
      );

    return {
      version:
        "1.0",

      agency: {
        id:
          agency.id,

        name:
          agency.name,

        city:
          agency.city,
      },

      site: site
        ? {
            id:
              site.id,

            slug:
              site.slug,

            basePath:
              site.basePath,

            status:
              site.status,

            published:
              isPublished(
                site
              ),

            publishedAt:
              site.publishedAt,
          }
        : null,

      readiness: {
        score,

        grade:
          score >= 90
            ? "A"
            : score >= 75
              ? "B"
              : score >= 60
                ? "C"
                : score >= 40
                  ? "D"
                  : "E",

        ready:
          blockers.length ===
          0,

        blockers,
      },

      checks,
    };
  }

  async network() {
    const agencies =
      await this.prisma
        .agency
        .findMany({
          select: {
            id:
              true,
          },

          orderBy: {
            id:
              "asc",
          },
        });

    const items = [];

    for (
      const agency
      of agencies
    ) {
      try {
        items.push(
          await this.readiness(
            agency.id
          )
        );
      } catch (error) {
        items.push({
          agency: {
            id:
              agency.id,
          },

          error: {
            code:
              error.code ||
              "AGENCY_LAUNCH_ERROR",

            message:
              error.message,
          },
        });
      }
    }

    return {
      version:
        "1.0",

      generatedAt:
        new Date()
          .toISOString(),

      total:
        items.length,

      ready:
        items.filter(
          (item) =>
            item.readiness
              ?.ready ===
            true
        ).length,

      published:
        items.filter(
          (item) =>
            item.site
              ?.published ===
            true
        ).length,

      items,
    };
  }
}

module.exports = {
  AgencyLaunchService,
  normalizeStatus,
  isPublished,
  pageBySlug,
  pageCheck,

  resolveLaunchState,
  summarizeLaunchStates,
};
