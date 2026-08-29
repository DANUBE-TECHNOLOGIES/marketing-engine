"use strict";

const {
  Prisma,
} = require("@prisma/client");

const {
  hydrateGalleryMediaAssets,
} = require("./gallery-media-hydrator");
const {
  hydrateTeamMediaAssets,
} = require("./team-media-hydrator");

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

function publicBlocks(blocks, { pagePublished = false } = {}) {
  if (!Array.isArray(blocks)) return [];

  /*
   * Le contrat V2 publie la page comme unité éditoriale. Plusieurs blocs
   * historiques portent encore status="draft" alors qu'ils appartiennent à
   * une page explicitement publiée. Les filtrer individuellement rend la
   * page publique vide alors que le Designer affiche bien ses blocs.
   *
   * Une page non publiée reste totalement exclue par bySlug(); pour une page
   * publiée, on expose donc tous ses blocs visibles et on conserve leur statut
   * technique sans lui donner un rôle de publication autonome.
   */
  const source = pagePublished
    ? blocks
    : blocks.filter(publishedLike);

  return source.map(normalizeBlock);
}

function normalizePage(page) {
  const published = publishedLike(page);

  return {
    id: page.id,
    slug: page.slug,
    title: page.title ?? "",
    status: page.status ?? null,
    published,
    publishedAt: page.publishedAt ?? null,
    displayOrder: page.displayOrder ?? 0,
    seoTitle: page.seoTitle ?? null,
    metaDescription: page.metaDescription ?? null,
    path: page.path ?? null,
    blocks: publicBlocks(page.blocks, { pagePublished: published }),
  };
}

function destinationSlugFromItem(item) {
  if (!item || typeof item !== "object") return null;
  if (item.slug) return String(item.slug).trim().toLowerCase();

  const href = String(item.href || item.url || "").trim();
  if (!href) return null;

  const match = href.match(/(?:^|\/)destinations?\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : null;
}

function isDestinationBlock(block) {
  return [
    "destination-grid",
    "destinations",
    "destinations-highlight",
    "destination-recommendations",
  ].includes(String(block?.type || block?.blockType || "").toLowerCase());
}

function collectDestinationSlugs(pages) {
  const slugs = new Set();

  for (const page of pages || []) {
    for (const block of page.blocks || []) {
      if (!isDestinationBlock(block)) continue;
      const items = Array.isArray(block.content?.items) ? block.content.items : [];
      for (const item of items) {
        const slug = destinationSlugFromItem(item);
        if (slug) slugs.add(slug);
      }
    }
  }

  return [...slugs];
}

function destinationImageFromItem(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [
    item.image,
    item.imageUrl,
    item.backgroundImage,
    item.coverImage,
    item.heroImage,
    item.thumbnail,
    item.photo,
    item.media?.url,
    item.image?.url,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function enrichDestinationItem(item, destination) {
  if (!destination) return item;

  const existingImage = destinationImageFromItem(item);
  const image = existingImage || destination.heroImageUrl || null;

  return {
    ...item,
    slug: item.slug || destination.slug,
    title: item.title || item.name || destination.name,
    name: item.name || destination.name,
    description: item.description || destination.tagline || destination.summary || null,
    ...(image ? { image } : {}),
    travelCoreId: item.travelCoreId || destination.id,
  };
}

function enrichPagesWithDestinations(pages, destinations) {
  const bySlug = new Map(
    (destinations || []).map((destination) => [String(destination.slug || "").toLowerCase(), destination])
  );

  return (pages || []).map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isDestinationBlock(block)) return block;
      const items = Array.isArray(block.content?.items) ? block.content.items : [];

      return {
        ...block,
        content: {
          ...(block.content || {}),
          items: items.map((item) => {
            const slug = destinationSlugFromItem(item);
            return enrichDestinationItem(item, slug ? bySlug.get(slug) : null);
          }),
          __dataSource: "travel-core",
        },
      };
    }),
  }));
}

class PublicSiteReadService {
  constructor({ prisma } = {}) {
    if (!prisma) throw new Error("Le client Prisma est obligatoire.");
    this.prisma = prisma;
  }

  buildSelect() {
    const siteFields = fieldsFor("AgencySite");
    const pageFields = fieldsFor("AgencySitePage");
    const agencyFields = fieldsFor("Agency");
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

    const agencySelect = {
      id: true,
      ...pickFields(agencyFields, [
        "name",
        "tenantId",
        "city",
        "address",
        "postalCode",
        "region",
        "phone",
        "email",
        "description",
        "latitude",
        "longitude",
        "website",
        "googleBusinessUrl",
        "googleMapsUrl",
        "facebookUrl",
        "instagramUrl",
        "linkedinUrl",
        "imageUrl",
        "logoUrl",
        "targetCities",
      ]),
    };

    const siteSelect = {
      id: true,
      agencyId: true,
      slug: true,
      ...pickFields(siteFields, [
        "tenantId", "name", "basePath", "status", "published", "isPublished",
        "publishedAt", "theme", "generatedAt", "createdAt", "updatedAt",
        "heroImageUrl", "logoUrl", "targetCities", "metadata",
      ]),
      agency: {
        select: agencySelect,
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

  async enrichDestinations(pages, tenantId) {
    const slugs = collectDestinationSlugs(pages);
    if (!slugs.length || !this.prisma.destination?.findMany) return pages;

    const destinations = await this.prisma.destination.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        slug: { in: slugs },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        tagline: true,
        summary: true,
        heroImageUrl: true,
      },
    });

    return enrichPagesWithDestinations(pages, destinations);
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
    const visiblePagesRaw = pages.filter((page) => page.published);
    const tenantId = site.tenantId ?? site.agency?.tenantId ?? null;
    const destinationEnrichedPages = await this.enrichDestinations(
      visiblePagesRaw,
      tenantId
    );
    const galleryEnrichedPages = await hydrateGalleryMediaAssets({
      prisma: this.prisma,
      tenantId,
      pages: destinationEnrichedPages,
    });
    const visiblePages = await hydrateTeamMediaAssets({
      prisma: this.prisma,
      tenantId,
      pages: galleryEnrichedPages,
    });
    const homePage = visiblePages.find((page) =>
      page.slug === "" || ["accueil", "home"].includes(String(page.slug || "").toLowerCase())
    ) || visiblePages[0] || null;
    const canonicalBasePath = `/agence/${site.slug}`;

    return {
      version: "1.1",
      site: {
        id: site.id,
        agencyId: site.agencyId,
        tenantId,
        slug: site.slug,
        name: site.name ?? site.agency?.name ?? "",
        basePath: canonicalBasePath,
        status: site.status ?? null,
        published: publishedLike(site),
        publishedAt: site.publishedAt ?? null,
        theme: site.theme ?? {},
        heroImageUrl: site.heroImageUrl ?? null,
        logoUrl: site.logoUrl ?? null,
        targetCities: site.targetCities ?? site.agency?.targetCities ?? [],
        metadata: site.metadata ?? {},
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
  destinationSlugFromItem,
  collectDestinationSlugs,
  enrichDestinationItem,
  enrichPagesWithDestinations,
};
