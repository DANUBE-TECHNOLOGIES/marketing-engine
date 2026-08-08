"use strict";

const {
  Prisma,
} = require(
  "@prisma/client"
);

function modelFields(
  modelName
) {
  const model =
    Prisma.dmmf
      .datamodel
      .models
      .find(
        (item) =>
          item.name ===
          modelName
      );

  return new Set(
    model?.fields.map(
      (field) =>
        field.name
    ) || []
  );
}

function selectExisting(
  fields,
  candidates
) {
  return Object.fromEntries(
    candidates
      .filter(
        (field) =>
          fields.has(
            field
          )
      )
      .map(
        (field) => [
          field,
          true,
        ]
      )
  );
}

class MiniSiteSeoRepository {
  constructor(
    prisma
  ) {
    this.prisma =
      prisma;
  }

  async listSites() {
    const agencyFields =
      modelFields(
        "Agency"
      );

    const siteFields =
      modelFields(
        "AgencySite"
      );

    const pageFields =
      modelFields(
        "AgencySitePage"
      );

    const agencySelect =
      selectExisting(
        agencyFields,
        [
          "id",
          "name",
          "city",
          "address",
          "postalCode",
          "phone",
          "email",
        ]
      );

    const siteSelect =
      selectExisting(
        siteFields,
        [
          "id",
          "agencyId",
          "slug",
          "status",
          "publishedAt",
        ]
      );

    const pageSelect =
      selectExisting(
        pageFields,
        [
          "id",
          "siteId",
          "slug",
          "title",
          "status",
          "seoTitle",
          "metaDescription",
          "seoDescription",
          "published",
          "displayOrder",
        ]
      );

    return this.prisma
      .agencySite
      .findMany({
        select: {
          ...siteSelect,

          agency: {
            select:
              agencySelect,
          },

          pages: {
            select:
              pageSelect,

            orderBy:
              pageFields.has(
                "displayOrder"
              )
                ? {
                    displayOrder:
                      "asc",
                  }
                : {
                    id:
                      "asc",
                  },
          },
        },

        orderBy:
          siteFields.has(
            "createdAt"
          )
            ? {
                createdAt:
                  "asc",
              }
            : {
                id:
                  "asc",
              },
      });
  }
}

module.exports = {
  MiniSiteSeoRepository,
  modelFields,
  selectExisting,
};

/*
 * MSE-24.2B — persistance SEO non destructive.
 */

MiniSiteSeoRepository.prototype.findSiteByAgency =
async function findSiteByAgency(
  agencyId
) {
  const agencyModel =
    Prisma.dmmf
      .datamodel
      .models
      .find(
        (model) =>
          model.name ===
          "Agency"
      );

  const idField =
    agencyModel?.fields
      .find(
        (field) =>
          field.name ===
          "id"
      );

  let normalizedAgencyId =
    agencyId;

  if (
    idField?.type ===
    "Int"
  ) {
    normalizedAgencyId =
      Number.parseInt(
        String(
          agencyId
        ),
        10
      );

    if (
      !Number.isInteger(
        normalizedAgencyId
      )
    ) {
      const error =
        new Error(
          `Identifiant agence invalide : ${agencyId}`
        );

      error.code =
        "MINISITE_SEO_INVALID_AGENCY_ID";

      error.status =
        400;

      throw error;
    }
  }

  const sites =
    await this.listSites();

  return (
    sites.find(
      (site) =>
        String(
          site.agencyId
        ) ===
        String(
          normalizedAgencyId
        )
    ) ||
    null
  );
};

MiniSiteSeoRepository.prototype.applySeoItems =
async function applySeoItems({
  items,
  dryRun = true,
} = {}) {
  const {
    buildSeoUpdate,
    summarizeExecution,
  } = require("./executor");

  const execute =
    async (client) => {
      const results = [];

      for (
        const item
        of items || []
      ) {
        const update =
          buildSeoUpdate(
            item
          );

        const fields =
          Object.keys(
            update
          );

        if (
          !fields.length
        ) {
          results.push({
            pageId:
              item.pageId,

            slug:
              item.slug,

            changed:
              false,

            fields:
              [],
          });

          continue;
        }

        const currentPage =
          await client
            .agencySitePage
            .findUnique({
              where: {
                id:
                  item.pageId,
              },

              select: {
                id:
                  true,

                seoTitle:
                  true,

                metaDescription:
                  true,
              },
            });

        if (!currentPage) {
          const error =
            new Error(
              `Page introuvable : ${item.pageId}`
            );

          error.code =
            "MINISITE_SEO_PAGE_NOT_FOUND";

          error.status =
            404;

          throw error;
        }

        const safeUpdate = {};

        if (
          fields.includes(
            "seoTitle"
          ) &&
          !String(
            currentPage.seoTitle ||
            ""
          ).trim()
        ) {
          safeUpdate.seoTitle =
            update.seoTitle;
        }

        if (
          fields.includes(
            "metaDescription"
          ) &&
          !String(
            currentPage.metaDescription ||
            ""
          ).trim()
        ) {
          safeUpdate.metaDescription =
            update.metaDescription;
        }

        const safeFields =
          Object.keys(
            safeUpdate
          );

        if (
          !dryRun &&
          safeFields.length
        ) {
          await client
            .agencySitePage
            .update({
              where: {
                id:
                  item.pageId,
              },

              data:
                safeUpdate,
            });
        }

        results.push({
          pageId:
            item.pageId,

          slug:
            item.slug,

          changed:
            safeFields.length >
            0,

          fields:
            safeFields,

          dryRun,
        });
      }

      return {
        dryRun,

        items:
          results,

        summary:
          summarizeExecution(
            results
          ),
      };
    };

  if (dryRun) {
    return execute(
      this.prisma
    );
  }

  return this.prisma
    .$transaction(
      async (
        transaction
      ) =>
        execute(
          transaction
        )
    );
};

/*
 * MSE-24.2B-R3 — réduction non destructive des titres SEO trop longs.
 */

MiniSiteSeoRepository.prototype.normalizeLongSeoTitles =
async function normalizeLongSeoTitles({
  agencyId,
  limit = 65,
  dryRun = true,
} = {}) {
  const {
    normalizeSeoTitleLength,
  } = require("./executor");

  const agencyModel =
    Prisma.dmmf
      .datamodel
      .models
      .find(
        (model) =>
          model.name ===
          "Agency"
      );

  const idField =
    agencyModel?.fields
      .find(
        (field) =>
          field.name ===
          "id"
      );

  let normalizedAgencyId =
    agencyId;

  if (
    idField?.type ===
    "Int"
  ) {
    normalizedAgencyId =
      Number.parseInt(
        String(
          agencyId
        ),
        10
      );

    if (
      !Number.isInteger(
        normalizedAgencyId
      )
    ) {
      const error =
        new Error(
          `Identifiant agence invalide : ${agencyId}`
        );

      error.code =
        "MINISITE_SEO_INVALID_AGENCY_ID";

      error.status =
        400;

      throw error;
    }
  }

  const execute =
    async (client) => {
      const site =
        await client
          .agencySite
          .findFirst({
            where: {
              agencyId:
                normalizedAgencyId,
            },

            select: {
              id:
                true,

              slug:
                true,

              pages: {
                select: {
                  id:
                    true,

                  slug:
                    true,

                  title:
                    true,

                  seoTitle:
                    true,
                },

                orderBy: {
                  displayOrder:
                    "asc",
                },
              },
            },
          });

      if (!site) {
        const error =
          new Error(
            "Mini-site introuvable pour cette agence."
          );

        error.code =
          "MINISITE_SEO_SITE_NOT_FOUND";

        error.status =
          404;

        throw error;
      }

      const items = [];

      for (
        const page
        of site.pages
      ) {
        const currentTitle =
          String(
            page.seoTitle ||
            ""
          ).trim();

        if (
          !currentTitle ||
          currentTitle.length <=
            limit
        ) {
          items.push({
            pageId:
              page.id,

            slug:
              page.slug,

            changed:
              false,

            previousTitle:
              currentTitle,

            nextTitle:
              currentTitle,

            previousLength:
              currentTitle.length,

            nextLength:
              currentTitle.length,
          });

          continue;
        }

        const nextTitle =
          normalizeSeoTitleLength(
            currentTitle,
            limit
          );

        if (
          !nextTitle ||
          nextTitle.length >
            limit
        ) {
          const error =
            new Error(
              `Impossible de normaliser le titre SEO de la page ${page.id}.`
            );

          error.code =
            "MINISITE_SEO_TITLE_NORMALIZATION_FAILED";

          error.status =
            500;

          throw error;
        }

        if (!dryRun) {
          await client
            .agencySitePage
            .update({
              where: {
                id:
                  page.id,
              },

              data: {
                seoTitle:
                  nextTitle,
              },
            });
        }

        items.push({
          pageId:
            page.id,

          slug:
            page.slug,

          changed:
            true,

          previousTitle:
            currentTitle,

          nextTitle,

          previousLength:
            currentTitle.length,

          nextLength:
            nextTitle.length,
        });
      }

      return {
        dryRun,

        agencyId:
          normalizedAgencyId,

        siteId:
          site.id,

        siteSlug:
          site.slug,

        limit,

        summary: {
          pagesProcessed:
            items.length,

          pagesChanged:
            items.filter(
              (item) =>
                item.changed
            ).length,

          pagesUnchanged:
            items.filter(
              (item) =>
                !item.changed
            ).length,

          remainingTooLong:
            items.filter(
              (item) =>
                item.nextLength >
                limit
            ).length,
        },

        items,
      };
    };

  if (dryRun) {
    return execute(
      this.prisma
    );
  }

  return this.prisma
    .$transaction(
      async (
        transaction
      ) =>
        execute(
          transaction
        )
    );
};
