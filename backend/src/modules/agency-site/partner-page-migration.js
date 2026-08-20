"use strict";

const { createNextVersion } = require("./page-builder-save");
const { partnerPageReadiness } = require("./partner-page-rollout");

const LEGACY_SECTION = "partner-categories";
const TARGET_SECTION = "partner-directory";

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function legacyPartnerSection(page = {}) {
  const sections = Array.isArray(page.sections) ? page.sections : [];
  const legacy = sections.filter((section) => text(section.sectionType).toLowerCase() === LEGACY_SECTION);
  const modern = sections.filter((section) => text(section.sectionType).toLowerCase() === TARGET_SECTION);
  return { legacy, modern };
}

function legacyGeneratedH1(value) {
  return text(value).toLowerCase() === "nos partenaires";
}

function legacyGeneratedMeta(value, agencyName) {
  const normalized = text(value);
  if (!normalized) return true;
  return normalized === `Nos partenaires chez ${agencyName}, votre agence de voyages` ||
    normalized.startsWith(`Nos partenaires chez ${agencyName}, votre agence de voyages à `) ||
    normalized.startsWith(`Découvrez les partenaires sélectionnés par ${agencyName} pour proposer des voyages fiables et adaptés`);
}

function targetPageFields(page, agency) {
  const agencyName = text(agency?.name || page?.site?.name);
  const city = text(agency?.city) || "votre ville";
  const desiredH1 = `Nos partenaires de voyage à ${city}`;
  const desiredSeoTitle = `Partenaires voyage à ${city} | ${agencyName}`;
  const desiredMeta = `Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par ${agencyName} à ${city} pour construire votre prochain voyage.`;

  return {
    h1: legacyGeneratedH1(page?.h1) ? desiredH1 : page.h1,
    seoTitle: desiredSeoTitle,
    metaDescription: legacyGeneratedMeta(page?.metaDescription, agencyName) ? desiredMeta : page.metaDescription,
  };
}

function migratedDirectoryContent(section = {}, agency = {}) {
  const source = section.jsonContent && typeof section.jsonContent === "object" && !Array.isArray(section.jsonContent)
    ? section.jsonContent
    : {};
  const agencyName = text(agency.name || source.agencyName);
  const city = text(agency.city || source.city) || "votre ville";
  const { items: _legacyItems, title: _legacyTitle, text: _legacyText, __builderType: _legacyType, ...preserved } = source;
  return {
    ...preserved,
    agencyName: agencyName || preserved.agencyName,
    city,
    title: "Tous nos partenaires voyage",
    text: `Retrouvez les tour-opérateurs, croisiéristes et spécialistes avec lesquels ${agencyName || "notre agence"} à ${city} peut étudier votre projet de voyage. Votre conseiller vérifie pour chaque dossier les disponibilités, les conditions et la solution la plus adaptée.`,
    __builderType: TARGET_SECTION,
  };
}

function migratedSections(page, agency) {
  return (page.sections || []).map((section) => {
    const type = text(section.sectionType).toLowerCase();
    if (type === LEGACY_SECTION) {
      return {
        ...section,
        sectionType: TARGET_SECTION,
        jsonContent: migratedDirectoryContent(section, agency),
      };
    }
    if (type === "page-header" && legacyGeneratedH1(page.h1)) {
      return {
        ...section,
        jsonContent: {
          ...(section.jsonContent || {}),
          title: `Nos partenaires de voyage à ${text(agency.city) || "votre ville"}`,
          __builderType: "page-header",
        },
      };
    }
    return section;
  });
}

function migrationPreviewForPage(page) {
  const agency = page?.site?.agency || {};
  const { legacy, modern } = legacyPartnerSection(page);
  let state = "not-eligible";
  let reason = "PARTNER_PAGE_STRUCTURE_UNEXPECTED";
  if (legacy.length === 1 && modern.length === 0) {
    state = "eligible";
    reason = null;
  } else if (legacy.length === 0 && modern.length === 1) {
    state = "already-migrated";
    reason = null;
  } else if (legacy.length > 1 || modern.length > 1 || (legacy.length && modern.length)) {
    reason = "PARTNER_PAGE_SECTION_AMBIGUOUS";
  }

  const targetFields = targetPageFields(page, agency);
  const sections = state === "eligible" ? migratedSections(page, agency) : page.sections || [];
  const readinessAfter = state === "eligible"
    ? partnerPageReadiness({ ...page, ...targetFields, sections })
    : partnerPageReadiness(page);

  return {
    pageId: page.id,
    siteId: page.siteId,
    siteSlug: page.site?.slug || null,
    agencyId: Number(page.site?.agencyId || agency.id || 0),
    agencyName: agency.name || page.site?.name || null,
    city: agency.city || null,
    path: page.path,
    currentStatus: page.status,
    currentPublished: page.published === true,
    state,
    reason,
    legacySectionCount: legacy.length,
    directorySectionCount: modern.length,
    currentH1: page.h1,
    targetH1: targetFields.h1,
    currentSeoTitle: page.seoTitle,
    targetSeoTitle: targetFields.seoTitle,
    currentMetaDescription: page.metaDescription,
    targetMetaDescription: targetFields.metaDescription,
    readinessBefore: partnerPageReadiness(page),
    readinessAfter,
    preservesPublicationState: true,
  };
}

async function loadPartnerPages(prisma, tenantId) {
  return prisma.agencySitePage.findMany({
    where: {
      slug: "partenaires",
      site: { is: { tenantId } },
    },
    include: {
      site: { include: { agency: true } },
      sections: { orderBy: { displayOrder: "asc" } },
    },
    orderBy: { path: "asc" },
  });
}

async function previewPartnerPageMigration({ prisma, tenantId }) {
  const pages = await loadPartnerPages(prisma, tenantId);
  const items = pages.map(migrationPreviewForPage);
  return {
    version: "1.0",
    operation: "partner-page-legacy-migration-preview",
    dryRun: true,
    summary: {
      total: items.length,
      eligible: items.filter((item) => item.state === "eligible").length,
      alreadyMigrated: items.filter((item) => item.state === "already-migrated").length,
      blocked: items.filter((item) => item.state === "not-eligible").length,
      publishedEligible: items.filter((item) => item.state === "eligible" && item.currentPublished).length,
      draftEligible: items.filter((item) => item.state === "eligible" && !item.currentPublished).length,
      readyAfter: items.filter((item) => item.state === "eligible" && item.readinessAfter?.ready).length,
    },
    items,
  };
}

function confirmationError() {
  const error = new Error("La migration des pages Partenaires exige confirmed=true.");
  error.statusCode = 400;
  error.code = "PARTNER_PAGE_MIGRATION_CONFIRMATION_REQUIRED";
  return error;
}

async function applyPartnerPageMigration({ prisma, tenantId, input = {} }) {
  if (input.confirmed !== true) throw confirmationError();
  const pages = await loadPartnerPages(prisma, tenantId);
  const previews = pages.map(migrationPreviewForPage);
  const targets = previews.filter((item) => item.state === "eligible");
  const results = [];

  for (const target of targets) {
    const page = pages.find((candidate) => candidate.id === target.pageId);
    const agency = page.site.agency;
    const targetFields = targetPageFields(page, agency);
    const sections = migratedSections(page, agency);
    let version = null;

    await prisma.$transaction(async (tx) => {
      version = await createNextVersion(tx, page, {
        reason: input.reason || "mse-25.31-partner-directory-migration",
        createdBy: input.createdBy || "mse-25.31",
      });
      await tx.agencySitePage.update({
        where: { id: page.id },
        data: {
          h1: targetFields.h1,
          seoTitle: targetFields.seoTitle,
          metaDescription: targetFields.metaDescription,
          status: page.status,
          published: page.published === true,
        },
      });
      await tx.agencySiteSection.deleteMany({ where: { pageId: page.id } });
      await tx.agencySiteSection.createMany({
        data: sections.map((section) => ({
          pageId: page.id,
          sectionType: section.sectionType,
          jsonContent: section.jsonContent || {},
          displayOrder: section.displayOrder,
          status: section.status || "draft",
        })),
      });
    });

    results.push({
      pageId: page.id,
      agencyId: Number(page.site.agencyId),
      city: agency.city,
      path: page.path,
      previousStatus: page.status,
      previousPublished: page.published === true,
      preservedStatus: page.status,
      preservedPublished: page.published === true,
      savedVersion: version ? { id: version.id, version: version.version } : null,
    });
  }

  const after = await previewPartnerPageMigration({ prisma, tenantId });
  return {
    version: "1.0",
    operation: "partner-page-legacy-migration-apply",
    dryRun: false,
    migrated: results.length,
    results,
    after: after.summary,
  };
}

module.exports = {
  LEGACY_SECTION,
  TARGET_SECTION,
  applyPartnerPageMigration,
  legacyGeneratedH1,
  legacyGeneratedMeta,
  legacyPartnerSection,
  migratedDirectoryContent,
  migratedSections,
  migrationPreviewForPage,
  previewPartnerPageMigration,
  targetPageFields,
};
