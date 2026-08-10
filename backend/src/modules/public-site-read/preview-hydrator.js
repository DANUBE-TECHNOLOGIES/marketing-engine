"use strict";

const {
  hydratePublicDynamicBlocks,
} = require("./dynamic-block-hydrator");

async function resolvePreviewSiteContext({
  prisma,
  siteSlug,
}) {
  const slug = String(siteSlug || "").trim().toLowerCase();

  if (!slug) {
    const error = new Error("Slug de mini-site invalide.");
    error.statusCode = 400;
    error.code = "PUBLIC_SITE_PREVIEW_SLUG_INVALID";
    throw error;
  }

  const site = await prisma.agencySite.findFirst({
    where: { slug },
    select: {
      id: true,
      agencyId: true,
      tenantId: true,
      agency: {
        select: {
          tenantId: true,
        },
      },
    },
  });

  if (!site) {
    const error = new Error("Mini-site introuvable.");
    error.statusCode = 404;
    error.code = "PUBLIC_SITE_PREVIEW_NOT_FOUND";
    throw error;
  }

  return {
    siteId: site.id,
    agencyId: site.agencyId,
    tenantId: site.tenantId || site.agency?.tenantId || null,
  };
}

function normalizePreviewPage(page) {
  const source =
    page && typeof page === "object" && !Array.isArray(page)
      ? page
      : {};

  return {
    ...source,
    blocks: Array.isArray(source.blocks) ? source.blocks : [],
  };
}

async function hydratePreviewPage({
  prisma,
  siteSlug,
  page,
}) {
  const context = await resolvePreviewSiteContext({
    prisma,
    siteSlug,
  });

  const sourcePage = normalizePreviewPage(page);

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: context.tenantId,
    agencyId: context.agencyId,
    pages: [sourcePage],
    includeUnpublishedBlocks: true,
  });

  return {
    page: pages[0] || sourcePage,
    context,
  };
}

module.exports = {
  resolvePreviewSiteContext,
  normalizePreviewPage,
  hydratePreviewPage,
};
