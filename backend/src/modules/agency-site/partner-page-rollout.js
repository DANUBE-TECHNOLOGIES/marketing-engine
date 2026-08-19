"use strict";

const REQUIRED_PARTNER_SECTIONS = Object.freeze([
  "page-header",
  "partners-introduction",
  "partner-directory",
  "contact-cta",
]);
const SINGLETON_PARTNER_SECTIONS = new Set(REQUIRED_PARTNER_SECTIONS);

function pageFromSite(site, slug) {
  const expected = String(slug || "").trim().toLowerCase();
  return (Array.isArray(site?.pages) ? site.pages : []).find(
    (page) => String(page?.slug || "").trim().toLowerCase() === expected
  ) || null;
}

function partnerPageFromSite(site) {
  return pageFromSite(site, "partenaires");
}

function agencyPageFromSite(site) {
  return pageFromSite(site, "agence");
}

function partnerPageState(page) {
  if (!page) return "missing";
  if (page.published === true || page.status === "published") return "published";
  return page.status || "draft";
}

function normalizedSectionType(section = {}) {
  const content = section?.jsonContent || section?.content || {};
  return String(
    content?.__builderType ||
      section?.sectionType ||
      section?.blockType ||
      section?.type ||
      ""
  )
    .trim()
    .toLowerCase()
    .replace(/--\d+$/, "");
}

function canonicalPageSections(page = {}) {
  if (Array.isArray(page.sections) && page.sections.length) return page.sections;
  if (Array.isArray(page.blocks) && page.blocks.length) return page.blocks;
  if (Array.isArray(page.sections)) return page.sections;
  if (Array.isArray(page.blocks)) return page.blocks;
  return [];
}

function partnerPageReadiness(page) {
  if (!page) {
    return {
      ready: false,
      issues: [{ code: "PARTNER_PAGE_MISSING", severity: "blocking" }],
      missingSections: [...REQUIRED_PARTNER_SECTIONS],
      duplicateSections: [],
    };
  }

  const sections = canonicalPageSections(page);
  const counts = new Map();
  for (const section of sections) {
    const type = normalizedSectionType(section);
    if (!type) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
  }
  const missingSections = REQUIRED_PARTNER_SECTIONS.filter((type) => !counts.has(type));
  const duplicateSections = [...counts.entries()]
    .filter(([type, count]) => SINGLETON_PARTNER_SECTIONS.has(type) && count > 1)
    .map(([type, count]) => ({ type, count }));
  const issues = [];

  for (const type of missingSections) {
    issues.push({ code: "PARTNER_PAGE_SECTION_MISSING", severity: "blocking", sectionType: type });
  }
  for (const duplicate of duplicateSections) {
    issues.push({ code: "PARTNER_PAGE_SINGLETON_DUPLICATED", severity: "blocking", ...duplicate });
  }

  const h1 = String(page.h1 || "").trim();
  const seoTitle = String(page.seoTitle || "").trim();
  const metaDescription = String(page.metaDescription || page.seoDescription || "").trim();
  if (!h1) issues.push({ code: "PARTNER_PAGE_H1_MISSING", severity: "blocking" });
  if (!seoTitle) issues.push({ code: "PARTNER_PAGE_SEO_TITLE_MISSING", severity: "blocking" });
  if (!metaDescription) issues.push({ code: "PARTNER_PAGE_META_DESCRIPTION_MISSING", severity: "blocking" });
  if (seoTitle && (seoTitle.length < 25 || seoTitle.length > 70)) {
    issues.push({ code: "PARTNER_PAGE_SEO_TITLE_LENGTH", severity: "warning", length: seoTitle.length });
  }
  if (metaDescription && (metaDescription.length < 100 || metaDescription.length > 170)) {
    issues.push({ code: "PARTNER_PAGE_META_DESCRIPTION_LENGTH", severity: "warning", length: metaDescription.length });
  }

  const blocking = issues.filter((issue) => issue.severity === "blocking");
  return {
    ready: blocking.length === 0,
    issues,
    blockingCount: blocking.length,
    warningCount: issues.length - blocking.length,
    missingSections,
    duplicateSections,
    sectionTypes: [...counts.keys()],
  };
}

async function detailedPartnerPage(service, site, summaryPage) {
  if (!summaryPage) return null;
  if (typeof service.page !== "function") return summaryPage;
  try {
    return await service.page(site.agencyId, "partenaires");
  } catch {
    return summaryPage;
  }
}

async function buildPartnerPageRolloutStatus(service) {
  const sites = await service.listSites();
  const rows = await Promise.all(sites.map(async (site) => {
    const page = partnerPageFromSite(site);
    const detailedPage = await detailedPartnerPage(service, site, page);
    const agencyPage = agencyPageFromSite(site);
    const readiness = page ? partnerPageReadiness(detailedPage) : null;
    return {
      siteId: site.id,
      siteName: site.name,
      siteSlug: site.slug,
      siteStatus: site.status,
      agencyId: Number(site.agencyId),
      agencyName: site.agency?.name || site.name,
      city: site.agency?.city || "",
      agencyPagePresent: Boolean(agencyPage),
      partnerPageState: partnerPageState(page),
      partnerPageReady: readiness?.ready === true,
      partnerPageReadiness: readiness,
      rolloutEligible: !page && Boolean(agencyPage),
      rolloutBlockReason: !page && !agencyPage ? "AGENCY_PAGE_MISSING" : null,
      partnerPage: page
        ? {
            id: page.id,
            title: page.title,
            slug: page.slug,
            path: page.path,
            status: page.status,
            published: Boolean(page.published),
          }
        : null,
    };
  }));

  return {
    version: "1.2",
    summary: {
      totalSites: rows.length,
      missing: rows.filter((row) => row.partnerPageState === "missing").length,
      eligibleMissing: rows.filter((row) => row.rolloutEligible).length,
      blockedMissing: rows.filter((row) => row.partnerPageState === "missing" && !row.rolloutEligible).length,
      published: rows.filter((row) => row.partnerPageState === "published").length,
      publishedReady: rows.filter((row) => row.partnerPageState === "published" && row.partnerPageReady).length,
      publishedNotReady: rows.filter((row) => row.partnerPageState === "published" && !row.partnerPageReady).length,
      draftOrReview: rows.filter((row) => !["missing", "published"].includes(row.partnerPageState)).length,
      draftOrReviewReady: rows.filter((row) => !["missing", "published"].includes(row.partnerPageState) && row.partnerPageReady).length,
    },
    sites: rows,
  };
}

function partnerRolloutScopeError(row = {}) {
  const error = new Error(
    `Le rollout Partenaires refuse de créer une autre page que /partenaires${row.siteSlug ? ` pour ${row.siteSlug}` : ""}. La page /agence doit déjà exister.`
  );
  error.statusCode = 409;
  error.code = "PARTNER_PAGE_ROLLOUT_AGENCY_PAGE_REQUIRED";
  error.details = {
    siteId: row.siteId || null,
    siteSlug: row.siteSlug || null,
    agencyId: row.agencyId || null,
  };
  return error;
}

async function ensurePartnerPageOnly(service, agencyId, input = {}) {
  if (input.confirmed !== true) {
    const error = new Error("La création de la page Partenaires exige une validation explicite.");
    error.statusCode = 400;
    error.code = "PARTNER_PAGE_CONFIRMATION_REQUIRED";
    throw error;
  }

  const status = await buildPartnerPageRolloutStatus(service);
  const row = status.sites.find((item) => Number(item.agencyId) === Number(agencyId));
  if (!row) {
    const error = new Error(`Mini-site de l'agence ${agencyId} introuvable.`);
    error.statusCode = 404;
    error.code = "AGENCY_SITE_NOT_FOUND";
    throw error;
  }
  if (row.partnerPageState !== "missing") {
    return service.ensurePartnerPage(agencyId, { confirmed: true });
  }
  if (!row.rolloutEligible) throw partnerRolloutScopeError(row);
  return service.ensurePartnerPage(agencyId, { confirmed: true });
}

async function ensureNetworkPartnerPages(service, input = {}) {
  if (input.confirmed !== true) {
    const error = new Error("Le rollout réseau de la page Partenaires exige une validation explicite.");
    error.statusCode = 400;
    error.code = "PARTNER_PAGE_NETWORK_CONFIRMATION_REQUIRED";
    throw error;
  }

  const before = await buildPartnerPageRolloutStatus(service);
  const targets = before.sites.filter((row) => row.rolloutEligible);
  const blocked = before.sites
    .filter((row) => row.partnerPageState === "missing" && !row.rolloutEligible)
    .map((row) => ({
      agencyId: row.agencyId,
      siteId: row.siteId,
      siteSlug: row.siteSlug,
      reason: row.rolloutBlockReason,
    }));
  const results = [];

  for (const target of targets) {
    const result = await service.ensurePartnerPage(target.agencyId, { confirmed: true });
    results.push({
      agencyId: target.agencyId,
      siteId: target.siteId,
      siteSlug: target.siteSlug,
      created: result.created,
      skipped: result.skipped,
      partnerPage: result.partnerPage,
    });
  }

  const after = await buildPartnerPageRolloutStatus(service);
  return {
    version: "1.2",
    dryRun: false,
    createdSiteCount: results.filter((result) => Number(result.created || 0) > 0).length,
    blockedSiteCount: blocked.length,
    blocked,
    results,
    before: before.summary,
    after: after.summary,
  };
}

module.exports = {
  REQUIRED_PARTNER_SECTIONS,
  agencyPageFromSite,
  buildPartnerPageRolloutStatus,
  canonicalPageSections,
  detailedPartnerPage,
  ensureNetworkPartnerPages,
  ensurePartnerPageOnly,
  normalizedSectionType,
  pageFromSite,
  partnerPageFromSite,
  partnerPageReadiness,
  partnerPageState,
  partnerRolloutScopeError,
};
