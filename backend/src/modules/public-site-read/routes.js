"use strict";

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const {
  SectionAwarePublicSiteReadService,
} = require("./section-aware-service");
const { hydratePublicDynamicBlocks } = require("./dynamic-block-hydrator");
const { hydratePreviewPage } = require("./preview-hydrator");
const {
  hydrateDestinationMediaAssets,
} = require("./destination-media-hydrator");
const {
  hydrateTeamMediaAssets,
} = require("./team-media-hydrator");
const {
  hydrateImageTextMediaAssets,
} = require("./image-text-media-hydrator");
const {
  hydrateGalleryMediaAssets,
} = require("./gallery-media-hydrator");
const {
  contentTargetsAgency,
} = require("../ai-content/editorial-targeting");

function replacePageReference(reference, pages) {
  if (!reference) return null;
  return pages.find((page) => page.id === reference.id) || reference;
}

function blockType(block) {
  return String(block?.blockType || block?.type || "").trim().toLowerCase();
}

function inspirationIds(pages = []) {
  const ids = new Set();

  for (const page of pages) {
    for (const block of page?.blocks || []) {
      if (blockType(block) !== "inspirations") continue;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      for (const key of ["items", "inspirations", "articles"]) {
        for (const item of Array.isArray(content[key]) ? content[key] : []) {
          if (item?.id !== undefined && item?.id !== null) ids.add(String(item.id));
        }
      }
    }
  }

  return [...ids];
}

function destinationSlugFromItem(item) {
  if (!item || typeof item !== "object") return null;
  if (item.slug) return String(item.slug).trim().toLowerCase();

  const href = String(item.href || item.url || "").trim();
  if (!href) return null;

  const match = href.match(/(?:^|\/)destinations?\/([^/?#]+)/i);
  return match?.[1] ? decodeURIComponent(match[1]).trim().toLowerCase() : null;
}

function isCanonicalDestinationBlock(block) {
  return [
    "destination-grid",
    "destinations",
    "destinations-highlight",
    "destination-recommendations",
  ].includes(blockType(block));
}

async function enrichCanonicalDestinationBlocks({ database, tenantId, pages }) {
  const slugs = new Set();

  for (const page of pages || []) {
    for (const block of page?.blocks || []) {
      if (!isCanonicalDestinationBlock(block)) continue;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      for (const item of Array.isArray(content.items) ? content.items : []) {
        const slug = destinationSlugFromItem(item);
        if (slug) slugs.add(slug);
      }
    }
  }

  if (!tenantId || !slugs.size || !database?.destination?.findMany) return pages;

  const destinations = await database.destination.findMany({
    where: {
      tenantId: String(tenantId),
      status: "published",
      slug: { in: [...slugs] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      region: true,
      tagline: true,
      summary: true,
      heroImageUrl: true,
    },
  });

  const bySlug = new Map(destinations.map((destination) => [String(destination.slug).toLowerCase(), destination]));

  return (pages || []).map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (!isCanonicalDestinationBlock(block)) return block;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      const items = Array.isArray(content.items) ? content.items : [];

      return {
        ...block,
        content: {
          ...content,
          __dataSource: "travel-core",
          items: items.map((item) => {
            const slug = destinationSlugFromItem(item);
            const destination = slug ? bySlug.get(slug) : null;
            if (!destination) return item;

            return {
              ...item,
              slug: item.slug || destination.slug,
              name: item.name || destination.name,
              title: item.title || destination.name,
              eyebrow: item.eyebrow || destination.country || destination.region || null,
              description: item.description || destination.summary || destination.tagline || null,
              ...(item.image || destination.heroImageUrl
                ? { image: item.image || destination.heroImageUrl }
                : {}),
              travelCoreId: item.travelCoreId || destination.id,
            };
          }),
        },
      };
    }),
  }));
}

function sendPublicSiteError(response, error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);

  response.status(
    Number.isInteger(statusCode) && statusCode >= 400 && statusCode <= 599
      ? statusCode
      : 500
  ).json({
    error: error?.code || "PUBLIC_SITE_READ_ERROR",
    message:
      statusCode >= 500
        ? "Le mini-site est momentanément indisponible."
        : error?.message || "Impossible de charger le mini-site.",
    details: statusCode >= 500 ? {} : error?.details || {},
  });
}

async function resolvePublicTenantId(database, request) {
  const direct = String(
    request?.tenant?.id ||
    request?.tenantId ||
    request?.get?.("x-tenant-id") ||
    ""
  ).trim();

  if (direct) return direct;

  const slug = String(
    request?.tenant?.slug ||
    request?.tenantSlug ||
    request?.get?.("x-tenant-slug") ||
    ""
  ).trim();

  if (!slug) {
    const error = new Error("Tenant public obligatoire.");
    error.code = "PUBLIC_SITE_TENANT_REQUIRED";
    error.statusCode = 400;
    throw error;
  }

  const tenant = await database.tenant.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!tenant) {
    const error = new Error("Tenant public introuvable.");
    error.code = "PUBLIC_SITE_TENANT_NOT_FOUND";
    error.statusCode = 404;
    error.details = { slug };
    throw error;
  }

  return String(tenant.id);
}

async function filterAgencyInspirations({ database, tenantId, agencyId, pages }) {
  const ids = inspirationIds(pages);
  if (!ids.length || !tenantId || !agencyId || !database?.seoContent) return pages;

  const contents = await database.seoContent.findMany({
    where: {
      tenantId: String(tenantId),
      id: { in: ids },
      status: "published",
      publishedAt: { not: null },
    },
    select: { id: true, seo: true },
  });
  const allowed = new Set(
    contents
      .filter((content) => contentTargetsAgency(content, agencyId))
      .map((content) => String(content.id))
  );

  return pages.map((page) => ({
    ...page,
    blocks: (page.blocks || []).map((block) => {
      if (blockType(block) !== "inspirations") return block;
      const content = block?.content && typeof block.content === "object" ? block.content : {};
      const next = { ...content };

      for (const key of ["items", "inspirations", "articles"]) {
        if (!Array.isArray(content[key])) continue;
        next[key] = content[key].filter((item) => allowed.has(String(item?.id)));
      }

      return { ...block, content: next };
    }),
  }));
}

async function hydrateContract({ database, contract }) {
  const tenantId = contract?.site?.tenantId || null;
  const agencyId = contract?.site?.agencyId || contract?.agency?.id || null;
  const hydratedPages = await hydratePublicDynamicBlocks({
    prisma: database,
    tenantId,
    agencyId,
    pages: contract?.pages || [],
    // Les pages de ce contrat ont déjà été filtrées comme publiques par
    // SectionAwarePublicSiteReadService. Les blocs V2 historiques peuvent
    // encore porter status="draft" sans être des brouillons autonomes : leur
    // publication est pilotée au niveau de la page. Ne pas les refiltrer ici.
    includeUnpublishedBlocks: true,
  });
  const destinationEnrichedPages = await enrichCanonicalDestinationBlocks({
    database,
    tenantId,
    pages: hydratedPages,
  });
  const destinationMediaPages =
    await hydrateDestinationMediaAssets({
      prisma: database,
      tenantId,
      pages: destinationEnrichedPages,
    });

  const teamMediaPages =
    await hydrateTeamMediaAssets({
      prisma: database,
      tenantId,
      pages: destinationMediaPages,
    });

  const imageTextMediaPages =
    await hydrateImageTextMediaAssets({
      prisma: database,
      tenantId,
      pages: teamMediaPages,
    });

  const galleryMediaPages =
    await hydrateGalleryMediaAssets({
      prisma: database,
      tenantId,
      pages: imageTextMediaPages,
    });

  const pages = await filterAgencyInspirations({
    database,
    tenantId,
    agencyId,
    pages: galleryMediaPages,
  });

  return {
    ...contract,
    pages,
    homePage: replacePageReference(contract?.homePage, pages),
    page: replacePageReference(contract?.page, pages),
  };
}

function createPublicSiteReadRouter({ prisma } = {}) {
  const database = prisma || new PrismaClient();
  const service = new SectionAwarePublicSiteReadService({ prisma: database });
  const router = express.Router();

  router.get("/health", (request, response) => {
    response.json({
      ok: true,
      capability: "public-site-read",
      version: "1.9",
      contentSource: "website-designer-v2-blocks",
      fallbackContentSource: "agency-site-sections",
      dynamicHydration: "single-pipeline",
      editorialTargeting: "tenant-and-agency-aware",
      publicTenantScope: "required",
      stableJsonErrors: true,
      writeOperations: false,
    });
  });

  router.post("/sites/:siteSlug/preview-hydrate", async (request, response) => {
    try {
      const tenantId = await resolvePublicTenantId(database, request);
      const result = await hydratePreviewPage({
        prisma: database,
        siteSlug: request.params.siteSlug,
        tenantId,
        page: request.body?.page || request.body || {},
      });
      response.set("Cache-Control", "private, no-store");
      response.json({ page: result.page });
    } catch (error) {
      sendPublicSiteError(response, error);
    }
  });

  router.get("/sites/:siteSlug", async (request, response) => {
    try {
      const tenantId = await resolvePublicTenantId(database, request);
      const baseContract = await service.bySlug(request.params.siteSlug, tenantId);
      const contract = await hydrateContract({ database, contract: baseContract });
      response.set("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      response.json(contract);
    } catch (error) {
      sendPublicSiteError(response, error);
    }
  });

  return router;
}

module.exports = {
  createPublicSiteReadRouter,
  hydrateContract,
  enrichCanonicalDestinationBlocks,
  destinationSlugFromItem,
  isCanonicalDestinationBlock,
  replacePageReference,
  filterAgencyInspirations,
  inspirationIds,
  resolvePublicTenantId,
  sendPublicSiteError,
};
