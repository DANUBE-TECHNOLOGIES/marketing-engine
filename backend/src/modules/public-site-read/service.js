"use strict";

const {
  Prisma,
} = require("@prisma/client");

function fieldsFor(modelName) {
  const model = Prisma.dmmf.datamodel.models.find((entry) => entry.name === modelName);
  return new Set(model?.fields.map((field) => field.name) || []);
}

function pickFields(available, names) {
  return Object.fromEntries(names.filter((name) => available.has(name)).map((name) => [name, true]));
}

function normalizeSlug(value) {
  const slug = String(value || "").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    const error = new Error("Slug de mini-site invalide.");
    error.code = "PUBLIC_SITE_SLUG_INVALID";
    error.statusCode = 400;
    throw error;
  }
  return slug;
}

function publishedLike(record) {
  if (!record) return false;
  if (record.published === true || record.isPublished === true) return true;
  const status = String(record.status || "").toLowerCase();
  if (["published", "publish", "live", "online", "active"].includes(status)) return true;
  return Boolean(record.publishedAt);
}

function normalizeBlock(block) {
  return {
    id: block.id,
    type: block.blockType ?? block.type ?? null,
    blockType: block.blockType ?? block.type ?? null,
    status: block.status ?? null,
    displayOrder: block.displayOrder ?? block.order ?? 0,
    content: block.content ?? {},
    settings: block.settings ?? {},
    seo: block.seo ?? {},
    visibleDesktop: block.visibleDesktop ?? true,
    visibleMobile: block.visibleMobile ?? true,
    version: block.version ?? null,
  };
}

function publicBlocks(blocks) {
  return Array.isArray(blocks)
    ? blocks.filter(publishedLike).map(normalizeBlock)
    : [];
}

function normalizePage(page) {
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
    blocks: publicBlocks(page.blocks),
  };
}

class PublicSiteReadService {
  constructor({ prisma } = {}) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    this.prisma = prisma;
  }

  buildSelect() {
    const siteFields = fieldsFor("AgencySite");
    const pageFields = fieldsFor("AgencySitePage");
    const blockModelName = Prisma.dmmf.datamodel.models.some((model) => model.name === "AgencySitePageBlock")
      ? "AgencySitePageBlock"
      : "PageBlock";
    const blockFields = fieldsFor(blockModelName);

    const blockSelect = {
      id: true,
      ...pickFields(blockFields, [
        "blockType", "type", "status", "displayOrder", "order", "content",
        "settings", "seo", "visibleDesktop", "visibleMobile", "version",
      ]),
    };

    const pageSelect = {
      id: true,
      slug: true,
      ...pickFields(pageFields, [
        "title", "status", "published", "isPublished", "publishedAt",
        "displayOrder", "seoTitle", "metaDescription", "path",
      ]),
    };

    if (pageFields.has("blocks")) {
      pageSelect.blocks = {
        orderBy: blockFields.has("displayOrder")
          ? { displayOrder: "asc" }
          : blockFields.has("order")
            ? { order: "asc" }
            : { id: "asc" },
        select: blockSelect,
      };
    }

    const siteSelect = {
      id: true,
      agencyId: true,
      slug: true,
      ...pickFields(siteFields, [
        "tenantId", "name", "basePath", "status", "published", "isPublished",
        "publishedAt", "theme", "generatedAt", "createdAt", "updatedAt",
      ]),
      agency: {
        select: {
          id: true,
          name: true,
          tenantId: true,
          city: true,
          address: true,
          postalCode: true,
          phone: true,
          email: true,
        },
      },
    };

    if (siteFields.has("pages")) {
      siteSelect.pages = {
        orderBy: pageFields.has("displayOrder") ? { displayOrder: "asc" } : { id: "asc" },
        select: pageSelect,
      };
    }

    return siteSelect;
  }

  async bySlug(siteSlug) {
    const slug = normalizeSlug(siteSlug);
    const site = await this.prisma.agencySite.findFirst({
      where: { slug },
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

    const pages = Array.isArray(site.pages) ? site.pages.map(normalizePage) : [];
    const visiblePages = pages.filter((page) => page.published);
    const homePage = visiblePages.find((page) =>
      page.slug === "" || ["accueil", "home"].includes(String(page.slug || "").toLowerCase())
    ) || visiblePages[0] || null;
    const canonicalBasePath = `/agence/${site.slug}`;

    return {
      version: "1.0",
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
        path: page.slug === homePage?.slug ? canonicalBasePath : `${canonicalBasePath}/${page.slug}`,
        displayOrder: page.displayOrder,
      })),
      homePage,
      page: homePage,
    };
  }
}

module.exports = {
  PublicSiteReadService,
  fieldsFor,
  pickFields,
  normalizeSlug,
  publishedLike,
  normalizeBlock,
  publicBlocks,
  normalizePage,
};