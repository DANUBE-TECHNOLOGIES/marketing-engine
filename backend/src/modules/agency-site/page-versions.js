"use strict";

const { pageSlugCandidates } = require("./page-slug");
const {
  PAGE_STATUSES,
  assertPartnerPagePublishable,
  createNextVersion,
  normalizeDesignerBlocks,
} = require("./page-builder-save");

function error(message, statusCode, code) {
  const value = new Error(message);
  value.statusCode = statusCode;
  value.code = code;
  return value;
}

async function findScopedPage(prisma, tenantId, agencyId, slug) {
  const id = Number(agencyId);
  if (!Number.isInteger(id)) {
    throw error("Identifiant d’agence invalide.", 400, "INVALID_AGENCY_ID");
  }
  const page = await prisma.agencySitePage.findFirst({
    where: {
      site: { is: { agencyId: id, tenantId } },
      slug: { in: pageSlugCandidates(slug) },
    },
    orderBy: { slug: "desc" },
    include: {
      sections: { orderBy: { displayOrder: "asc" } },
      site: true,
    },
  });
  if (!page) {
    throw error(`Page ${slug || "accueil"} introuvable.`, 404, "AGENCY_SITE_PAGE_NOT_FOUND");
  }
  return page;
}

function versionSummary(version) {
  const page = version?.snapshot?.page || {};
  return {
    id: version.id,
    version: version.version,
    reason: version.reason || null,
    createdBy: version.createdBy || null,
    createdAt: version.createdAt,
    page: {
      title: page.title || null,
      status: page.status || null,
      published: page.published === true,
      h1: page.h1 || null,
      seoTitle: page.seoTitle || null,
    },
  };
}

async function listPageVersions({ prisma, tenantId, agencyId, slug }) {
  const page = await findScopedPage(prisma, tenantId, agencyId, slug);
  const versions = await prisma.agencySitePageVersion.findMany({
    where: { pageId: page.id },
    orderBy: { version: "desc" },
  });
  return {
    version: "1.0",
    operation: "list-page-versions",
    pageId: page.id,
    items: versions.map(versionSummary),
  };
}

function restoredPageData(snapshotPage, currentPage) {
  const status = String(snapshotPage?.status || "draft").trim().toLowerCase();
  if (!PAGE_STATUSES.has(status)) {
    throw error("Le snapshot contient un statut de page invalide.", 409, "AGENCY_SITE_VERSION_STATUS_INVALID");
  }
  return {
    title: String(snapshotPage?.title || currentPage.title || "").trim(),
    status,
    published: status === "published",
    seoTitle: String(snapshotPage?.seoTitle || currentPage.seoTitle || "").trim(),
    metaDescription: String(snapshotPage?.metaDescription || currentPage.metaDescription || "").trim(),
    h1: String(snapshotPage?.h1 || currentPage.h1 || snapshotPage?.title || currentPage.title || "").trim(),
  };
}

async function rollbackPageVersion({ prisma, tenantId, agencyId, slug, versionId, input = {} }) {
  const page = await findScopedPage(prisma, tenantId, agencyId, slug);
  const version = await prisma.agencySitePageVersion.findFirst({
    where: { id: String(versionId), pageId: page.id },
  });
  if (!version) {
    throw error("Version de page introuvable.", 404, "AGENCY_SITE_PAGE_VERSION_NOT_FOUND");
  }

  const snapshot = version.snapshot && typeof version.snapshot === "object" ? version.snapshot : null;
  if (!snapshot || !snapshot.page || !Array.isArray(snapshot.sections)) {
    throw error("Le snapshot de cette version est incomplet.", 409, "AGENCY_SITE_PAGE_VERSION_INVALID");
  }

  const restoredSections = normalizeDesignerBlocks(
    snapshot.sections.map((section) => ({
      sectionType: section.sectionType,
      jsonContent: section.jsonContent || {},
      displayOrder: section.displayOrder,
      status: section.status || "draft",
    }))
  );
  const data = restoredPageData(snapshot.page, page);

  assertPartnerPagePublishable({
    slug: page.slug,
    status: data.status,
    title: data.title,
    seoTitle: data.seoTitle,
    metaDescription: data.metaDescription,
    h1: data.h1,
    blocks: restoredSections,
  });

  let safetyVersion = null;
  await prisma.$transaction(async (tx) => {
    safetyVersion = await createNextVersion(tx, page, {
      reason: input.reason || `before-rollback-to-v${version.version}`,
      createdBy: input.createdBy || null,
    });
    await tx.agencySitePage.update({ where: { id: page.id }, data });
    await tx.agencySiteSection.deleteMany({ where: { pageId: page.id } });
    if (restoredSections.length) {
      await tx.agencySiteSection.createMany({
        data: restoredSections.map((section) => ({ pageId: page.id, ...section })),
      });
    }
  });

  const saved = await prisma.agencySitePage.findUnique({
    where: { id: page.id },
    include: {
      sections: { orderBy: { displayOrder: "asc" } },
      blocks: { orderBy: { displayOrder: "asc" } },
      site: true,
    },
  });

  return {
    version: "1.1",
    operation: "rollback-page-version",
    restoredVersion: versionSummary(version),
    safetyVersion: safetyVersion ? { id: safetyVersion.id, version: safetyVersion.version } : null,
    page: saved,
    publication: {
      status: saved.status,
      published: saved.published === true,
      publicEligible: saved.status === "published" && saved.published === true,
    },
  };
}

module.exports = {
  findScopedPage,
  listPageVersions,
  restoredPageData,
  rollbackPageVersion,
  versionSummary,
};