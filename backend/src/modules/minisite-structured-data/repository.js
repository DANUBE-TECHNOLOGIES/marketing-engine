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

function requireTenantId(value) {
  const tenantId = String(value || "").trim();

  if (!tenantId) {
    const error = new Error(
      "Le tenant est obligatoire pour les données structurées des mini-sites."
    );
    error.code = "MINISITE_STRUCTURED_DATA_TENANT_REQUIRED";
    error.status = 400;
    throw error;
  }

  return tenantId;
}

class MiniSiteStructuredDataRepository {
  constructor(prisma) {
    this.prisma = prisma;
  }

  async findSiteBySlug(siteSlug, tenantId) {
    const normalizedSlug = String(siteSlug || "").trim();

    if (!normalizedSlug) {
      const error = new Error("siteSlug est obligatoire.");
      error.code = "MINISITE_STRUCTURED_DATA_SITE_SLUG_REQUIRED";
      error.status = 400;
      throw error;
    }

    const sites = await this.listSites(tenantId);
    return sites.find((site) => String(site.slug || "") === normalizedSlug) || null;
  }

  async listPublishedEditorialContents(tenantId) {
    const resolvedTenantId = requireTenantId(tenantId);

    return this.prisma.seoContent.findMany({
      where: {
        tenantId: resolvedTenantId,
        channel: "article",
        status: "published",
        publishedAt: { not: null },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        seo: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: [
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
    });
  }

  async listSites(tenantId) {
    const resolvedTenantId = requireTenantId(tenantId);
    const agencyFields = modelFields("Agency");
    const agencyProfileFields = modelFields("AgencyProfile");
    const brandProfileFields = modelFields("BrandProfile");
    const siteFields = modelFields("AgencySite");
    const pageFields = modelFields("AgencySitePage");
    const blockFields = modelFields("PageBlock");

    const agencySelect = selectExisting(agencyFields, [
      "id", "tenantId", "name", "city", "address", "postalCode", "phone", "email",
      "website", "googleReviewUrl", "description",
    ]);
    const agencyProfileSelect = selectExisting(agencyProfileFields, [
      "timezone", "regularHours", "specialHours", "hoursSource", "googleSyncedAt", "updatedAt",
    ]);
    const brandProfileSelect = selectExisting(brandProfileFields, [
      "id", "tenantId", "agencyId", "facebookUrl", "instagramUrl", "linkedinUrl", "youtubeUrl", "updatedAt",
    ]);
    const siteSelect = selectExisting(siteFields, [
      "id", "tenantId", "agencyId", "slug", "status", "publishedAt", "logoUrl", "coverImageUrl", "description", "updatedAt",
    ]);
    const pageSelect = selectExisting(pageFields, [
      "id", "siteId", "slug", "title", "status", "published", "publishedAt", "seoTitle", "metaDescription", "displayOrder", "updatedAt",
    ]);
    const blockSelect = selectExisting(blockFields, [
      "id", "pageId", "blockType", "content", "displayOrder", "status",
    ]);

    return this.prisma.agencySite.findMany({
      where: { tenantId: resolvedTenantId },
      select: {
        ...siteSelect,
        agency: {
          select: {
            ...agencySelect,
            ...(agencyFields.has("profile") && Object.keys(agencyProfileSelect).length
              ? { profile: { select: agencyProfileSelect } }
              : {}),
            ...(agencyFields.has("brandProfiles") && Object.keys(brandProfileSelect).length
              ? {
                  brandProfiles: {
                    where: { tenantId: resolvedTenantId },
                    select: brandProfileSelect,
                    take: 1,
                  },
                }
              : {}),
          },
        },
        pages: {
          select: {
            ...pageSelect,
            blocks: {
              select: blockSelect,
              orderBy: blockFields.has("displayOrder")
                ? { displayOrder: "asc" }
                : { id: "asc" },
            },
          },
          orderBy: pageFields.has("displayOrder")
            ? { displayOrder: "asc" }
            : { id: "asc" },
        },
      },
      orderBy: siteFields.has("createdAt")
        ? { createdAt: "asc" }
        : { id: "asc" },
    });
  }
}

module.exports = {
  MiniSiteStructuredDataRepository,
  modelFields,
  requireTenantId,
  selectExisting,
};
