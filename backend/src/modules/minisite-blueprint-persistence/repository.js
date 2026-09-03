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

function normalizeModelId(
  modelName,
  value
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

  const idField =
    model?.fields.find(
      (field) =>
        field.name ===
        "id"
    );

  if (!idField) {
    return value;
  }

  if (
    idField.type ===
    "Int"
  ) {
    const parsed =
      Number.parseInt(
        String(value),
        10
      );

    if (
      !Number.isInteger(
        parsed
      )
    ) {
      const error =
        new Error(
          `Identifiant ${modelName} invalide : ${value}`
        );

      error.code =
        "BLUEPRINT_INVALID_MODEL_ID";

      error.status =
        400;

      throw error;
    }

    return parsed;
  }

  if (
    idField.type ===
    "BigInt"
  ) {
    try {
      return BigInt(
        String(value)
      );
    } catch {
      const error =
        new Error(
          `Identifiant ${modelName} invalide : ${value}`
        );

      error.code =
        "BLUEPRINT_INVALID_MODEL_ID";

      error.status =
        400;

      throw error;
    }
  }

  return String(value);
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

class BlueprintPersistenceRepository {
  constructor(
    prisma,
    tenantId = null
  ) {
    this.prisma =
      prisma;

    this.tenantId =
      tenantId;
  }

  async findAgency(
    agencyId
  ) {
    const agencyFields =
      modelFields(
        "Agency"
      );

    const select =
      selectExisting(
        agencyFields,
        [
          "id",
          "name",
          "email",
          "phone",
          "address",
          "postalCode",
          "city",
          "tenantId",
        ]
      );

    return this.prisma
      .agency
      .findUnique({
        where: {
          id:
            normalizeModelId(
              "Agency",
              agencyId
            ),
        },

        select,
      });
  }

  async findSiteByAgency(
    agencyId
  ) {
    const siteFields =
      modelFields(
        "AgencySite"
      );

    const pageFields =
      modelFields(
        "AgencySitePage"
      );

    const blockFields =
      modelFields(
        "PageBlock"
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
          "createdAt",
          "updatedAt",
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
          "displayOrder",
          "createdAt",
          "updatedAt",
        ]
      );

    const blockSelect =
      selectExisting(
        blockFields,
        [
          "id",
          "pageId",
          "blockType",
          "status",
          "displayOrder",
          "content",
          "settings",
          "seo",
        ]
      );

    return this.prisma
      .agencySite
      .findFirst({
        where: {
          agencyId:
            normalizeModelId(
              "Agency",
              agencyId
            ),
        },

        select: {
          ...siteSelect,

          pages: {
            select: {
              ...pageSelect,

              blocks: {
                select:
                  blockSelect,

                orderBy:
                  blockFields.has(
                    "displayOrder"
                  )
                    ? {
                        displayOrder:
                          "asc",
                      }
                    : undefined,
              },
            },

            orderBy:
              pageFields.has(
                "displayOrder"
              )
                ? {
                    displayOrder:
                      "asc",
                  }
                : undefined,
          },
        },
      });
  }

  async listAgencies() {
    const agencyFields =
      modelFields(
        "Agency"
      );

    const select =
      selectExisting(
        agencyFields,
        [
          "id",
          "name",
          "email",
          "phone",
          "city",
        ]
      );

    return this.prisma
      .agency
      .findMany({
        select,

        orderBy:
          agencyFields.has(
            "name"
          )
            ? {
                name:
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
  BlueprintPersistenceRepository,
  modelFields,
  normalizeModelId,
  selectExisting,
};

/*
 * MSE-24.1C — opérations transactionnelles non destructives.
 */

BlueprintPersistenceRepository.prototype.applyMissingBlocks =
async function applyMissingBlocks({
  siteId,
  pagePlans,
  dryRun = true,
} = {}) {
  if (!siteId) {
    throw new Error(
      "siteId est obligatoire."
    );
  }

  const {
    planAdditions,
    summarizeExecution,
  } = require("./executor");

  const prisma =
    this.prisma;

  const execute =
    async (client) => {
      const pages =
        await client
          .agencySitePage
          .findMany({
            where: {
              siteId,
            },

            include: {
              blocks: {
                orderBy: {
                  displayOrder:
                    "asc",
                },
              },
            },
          });

      const pageById =
        new Map(
          pages.map(
            (page) => [
              page.id,
              page,
            ]
          )
        );

      const results = [];

      for (
        const pagePlan
        of pagePlans || []
      ) {
        if (!pagePlan.pageId) {
          results.push({
            pageId:
              null,

            slug:
              pagePlan.slug,

            skipped:
              true,

            reason:
              "page-id-missing",

            createdBlocks:
              0,
          });

          continue;
        }

        const page =
          pageById.get(
            pagePlan.pageId
          );

        if (!page) {
          results.push({
            pageId:
              pagePlan.pageId,

            slug:
              pagePlan.slug,

            skipped:
              true,

            reason:
              "page-not-found",

            createdBlocks:
              0,
          });

          continue;
        }

        const additions =
          planAdditions(
            pagePlan,
            page.blocks
          );

        if (
          !dryRun &&
          additions.length
        ) {
          for (
            const addition
            of additions
          ) {
            await client
              .pageBlock
              .create({
                data: {
                  pageId:
                    page.id,

                  blockType:
                    addition.type,

                  status:
                    "draft",

                  displayOrder:
                    addition.position,

                  content:
                    addition.content ||
                    {},

                  settings:
                    addition.settings ||
                    {},

                  seo:
                    addition.seo ||
                    {},

                  visibleDesktop:
                    addition
                      .visibleDesktop !==
                    false,

                  visibleMobile:
                    addition
                      .visibleMobile !==
                    false,
                },
              });
          }
        }

        results.push({
          pageId:
            page.id,

          slug:
            page.slug,

          dryRun,

          createdBlocks:
            additions.length,

          blockTypes:
            additions.map(
              (block) =>
                block.type
            ),
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
      prisma
    );
  }

  return prisma.$transaction(
    async (transaction) =>
      execute(
        transaction
      )
  );
};
