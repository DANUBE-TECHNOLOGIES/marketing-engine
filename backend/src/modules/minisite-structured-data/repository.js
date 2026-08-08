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

class MiniSiteStructuredDataRepository {
  constructor(
    prisma
  ) {
    this.prisma =
      prisma;
  }


  async findSiteBySlug(
    siteSlug
  ) {
    const normalizedSlug =
      String(
        siteSlug || ""
      ).trim();

    if (!normalizedSlug) {
      const error =
        new Error(
          "siteSlug est obligatoire."
        );

      error.code =
        "MINISITE_STRUCTURED_DATA_SITE_SLUG_REQUIRED";

      error.status =
        400;

      throw error;
    }

    const sites =
      await this.listSites();

    return (
      sites.find(
        (site) =>
          String(
            site.slug || ""
          ) ===
          normalizedSlug
      ) ||
      null
    );
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

    const blockFields =
      modelFields(
        "PageBlock"
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
          "description",
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
          "logoUrl",
          "coverImageUrl",
          "description",
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
        ]
      );

    const blockSelect =
      selectExisting(
        blockFields,
        [
          "id",
          "pageId",
          "blockType",
          "content",
          "displayOrder",
          "status",
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
                    : {
                        id:
                          "asc",
                      },
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
  MiniSiteStructuredDataRepository,
  modelFields,
  selectExisting,
};
