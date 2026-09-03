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
  const pagePublished = publishedLike(page);

  /*
   * Designer V2 publie la page comme unité éditoriale. Des blocs V2
   * historiques conservent encore status="draft" alors que leur page est
   * explicitement publiée. Les filtrer individuellement rendrait la page
   * publique vide. Une page publiée expose donc tous ses blocs V2 ; le statut
   * technique du bloc reste conservé mais ne pilote plus sa publication.
   */
  const v2Blocks = Array.isArray(page.blocks)
    ? (pagePublished ? page.blocks : page.blocks.filter(publishedLike)).map(
        normalizeV2Block
      )
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
   * avec V2. Dès qu'au moins un bloc V2 existe sur une page publiée, il
   * devient la source publique de vérité de la page.
   */
  const blocks = v2Blocks.length
    ? v2Blocks
    : legacySections;

  return {
    id: page.id,
    slug: page.slug,
    title: page.title ?? "",
    status: page.status ?? null,
    published: pagePublished,
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

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function heroAssetReferences(pages = []) {
  const references = [];
  const seen = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      const type = String(block?.blockType || block?.type || "").trim().toLowerCase();
      if (type !== "hero") continue;

      const content = asObject(block.content);
      const reference = String(content.imageAssetId || "").trim();
      if (!reference || seen.has(reference)) continue;

      seen.add(reference);
      references.push(reference);
    }
  }

  return references;
}

async function loadPublishedHeroAssets({ prisma, tenantId, references = [] }) {
  if (!prisma?.asset || !tenantId || !references.length) return [];

  return prisma.asset.findMany({
    where: {
      tenantId,
      id: { in: references },
      type: "MEDIA_IMAGE",
      status: "published",
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      payload: true,
      metadata: true,
      currentVersion: true,
      publishedAt: true,
    },
  });
}

function hydrateHeroMediaAssets(pages = [], assets = []) {
  if (!assets.length) return pages;

  const byId = new Map(assets.map((asset) => [String(asset.id), asset]));

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      const type = String(block?.blockType || block?.type || "").trim().toLowerCase();
      if (type !== "hero") return block;

      const content = asObject(block.content);
      const imageAssetId = String(content.imageAssetId || "").trim();
      if (!imageAssetId) return block;

      const asset = byId.get(imageAssetId);
      if (!asset) return block;

      const payload = asObject(asset.payload);
      const url = String(payload.url || "").trim();
      if (!url) return block;

      return {
        ...block,
        content: {
          ...content,
          imageAssetId,
          imageUrl: url,
          imageAlt:
            String(payload.altText || "").trim() ||
            String(content.imageAlt || "").trim() ||
            asset.title ||
            "",
          __mediaSource: "asset-engine",
          __mediaVersion: asset.currentVersion ?? null,
        },
      };
    }),
  }));
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

    const normalizedPages = Array.isArray(site.pages)
      ? site.pages.map(normalizePublicPage)
      : [];

    const visiblePages = normalizedPages.filter((page) => page.published);

    const mediaReferences = heroAssetReferences(visiblePages);
    const heroAssets = await loadPublishedHeroAssets({
      prisma: this.prisma,
      tenantId: normalizedTenantId,
      references: mediaReferences,
    });
    const hydratedPages = hydrateHeroMediaAssets(visiblePages, heroAssets);

    const homePage =
      hydratedPages.find(
        (page) =>
          page.slug === "" ||
          ["accueil", "home"].includes(
            String(page.slug || "").toLowerCase()
          )
      ) ||
      hydratedPages[0] ||
      null;

    const canonicalBasePath = `/agence/${site.slug}`;

    return {
      version: "1.4",
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
      pages: hydratedPages,
      navigation: hydratedPages.map((page) => ({
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
  heroAssetReferences,
  loadPublishedHeroAssets,
  hydrateHeroMediaAssets,
};
