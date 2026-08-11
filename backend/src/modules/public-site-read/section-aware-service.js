"use strict";

const { Prisma } = require("@prisma/client");
const {
  PublicSiteReadService,
  normalizeSlug,
  publishedLike,
  normalizeBlock,
} = require("./service");

function fieldsFor(modelName) {
  const model = Prisma.dmmf.datamodel.models.find(
    (entry) => entry.name === modelName
  );

  return new Set(model?.fields.map((field) => field.name) || []);
}

function normalizeDesignerSection(section) {
  return {
    id: section.id,
    type: section.sectionType || null,
    blockType: section.sectionType || null,
    status: section.status || null,
    displayOrder: section.displayOrder ?? 0,
    content:
      section.jsonContent && typeof section.jsonContent === "object"
        ? section.jsonContent
        : {},
    settings: {},
    seo: {},
    visibleDesktop: true,
    visibleMobile: true,
    version: null,
    source: "agency-site-section",
  };
}

function normalizeV2Block(block) {
  return {
    ...normalizeBlock(block),
    source: "page-block-v2",
  };
}

function normalizePublicPage(page) {
  const v2Blocks = Array.isArray(page.blocks)
    ? page.blocks
        .filter((block) => {
          if (!block?.status) return true;
          return publishedLike(block);
        })
        .map(normalizeV2Block)
    : [];

  const legacySections = Array.isArray(page.sections)
    ? page.sections
        .filter((section) => publishedLike(section))
        .map(normalizeDesignerSection)
    : [];

  /*
   * Website Designer V2 persiste dans PageBlock, qui porte le contrat
   * riche (settings, SEO, visibilité, version). AgencySiteSection reste
   * le fallback historique pour les pages n'ayant pas encore été sauvées
   * avec V2. Dès qu'au moins un bloc V2 publié existe, il devient la source
   * publique de vérité de la page.
   */
  const blocks = v2Blocks.length
    ? v2Blocks
    : legacySections;

  return {
    id: page.id,
    slug: page.slug,
    title: page.title ?? "",
    status: page.status ?? null,
    published: publishedLike(page),
    publishedAt: page.publishedAt ?? null,
    displayOrder: page.displayOrder ?? 0,
    seoTitle: page.seoTitle ?? null,
    metaDescription: page.metaDescription ?? null,
    path: page.path ?? null,
    blocks,
    contentSource: v2Blocks.length
      ? "website-designer-v2-blocks"
      : legacySections.length
        ? "agency-site-sections"
        : "empty",
  };
}

class SectionAwarePublicSiteReadService extends PublicSiteReadService {
  buildSelect() {
    const select = super.buildSelect();
    const pageFields = fieldsFor("AgencySitePage");
    const sectionFields = fieldsFor("AgencySiteSection");

    if (
      select.pages?.select &&
      pageFields.has("sections") &&
      sectionFields.size
    ) {
      select.pages.select.sections = {
        orderBy: sectionFields.has("displayOrder")
          ? { displayOrder: "asc" }
          : { id: "asc" },
        select: {
          id: true,
          ...(sectionFields.has("sectionType")
            ? { sectionType: true }
            : {}),
          ...(sectionFields.has("status")
            ? { status: true }
            : {}),
          ...(sectionFields.has("displayOrder")
            ? { displayOrder: true }
            : {}),
          ...(sectionFields.has("jsonContent")
            ? { jsonContent: true }
            : {}),
        },
      };
    }

    return select;
  }

  async bySlug(siteSlug, tenantId) {
    const slug = normalizeSlug(siteSlug);
    const normalizedTenantId = String(tenantId || "").trim();

    if (!normalizedTenantId) {
      const error = new Error("Tenant public obligatoire.");
      error.code = "PUBLIC_SITE_TENANT_REQUIRED";
      error.statusCode = 400;
      error.details = { siteSlug: slug };
      throw error;
    }

    const site = await this.prisma.agencySite.findFirst({
      where: {
        slug,
        tenantId: normalizedTenantId,
      },
      select: this.buildSelect(),
    });

    if (!site) {
      const error = new Error("Mini-site introuvable.");
      error.code = "PUBLIC_SITE_NOT_FOUND";
      error.statusCode = 404;
      error.details = { siteSlug: slug };
      throw error;
    }

    if (!publishedLike(site)) {
      const error = new Error("Mini-site non publié.");
      error.code = "PUBLIC_SITE_NOT_PUBLISHED";
      error.statusCode = 404;
      error.details = { siteSlug: slug };
      throw error;
    }

    const pages = Array.isArray(site.pages)
      ? site.pages.map(normalizePublicPage)
      : [];

    const visiblePages = pages.filter((page) => page.published);

    const homePage =
      visiblePages.find(
        (page) =>
          page.slug === "" ||
          ["accueil", "home"].includes(
            String(page.slug || "").toLowerCase()
          )
      ) ||
      visiblePages[0] ||
      null;

    const canonicalBasePath = `/agence/${site.slug}`;

    return {
      version: "1.3",
      site: {
        id: site.id,
        agencyId: site.agencyId,
        tenantId: site.tenantId ?? site.agency?.tenantId ?? null,
        slug: site.slug,
        name: site.name ?? site.agency?.name ?? "",
        basePath: canonicalBasePath,
        status: site.status ?? null,
        published: publishedLike(site),
        publishedAt: site.publishedAt ?? null,
        theme: site.theme ?? {},
        agency: site.agency ?? null,
      },
      agency: site.agency ?? null,
      pages: visiblePages,
      navigation: visiblePages.map((page) => ({
        id: page.id,
        slug: page.slug,
        title: page.title,
        path:
          page.slug === homePage?.slug
            ? canonicalBasePath
            : `${canonicalBasePath}/${page.slug}`,
        displayOrder: page.displayOrder,
      })),
      homePage,
      page: homePage,
    };
  }
}

module.exports = {
  SectionAwarePublicSiteReadService,
  normalizeDesignerSection,
  normalizeV2Block,
  normalizePublicPage,
};
