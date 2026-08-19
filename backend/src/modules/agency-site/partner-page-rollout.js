"use strict";

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

async function buildPartnerPageRolloutStatus(service) {
  const sites = await service.listSites();
  const rows = sites.map((site) => {
    const page = partnerPageFromSite(site);
    const agencyPage = agencyPageFromSite(site);
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
  });

  return {
    version: "1.1",
    summary: {
      totalSites: rows.length,
      missing: rows.filter((row) => row.partnerPageState === "missing").length,
      eligibleMissing: rows.filter((row) => row.rolloutEligible).length,
      blockedMissing: rows.filter((row) => row.partnerPageState === "missing" && !row.rolloutEligible).length,
      published: rows.filter((row) => row.partnerPageState === "published").length,
      draftOrReview: rows.filter((row) => !["missing", "published"].includes(row.partnerPageState)).length,
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
    version: "1.1",
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
  agencyPageFromSite,
  buildPartnerPageRolloutStatus,
  ensureNetworkPartnerPages,
  ensurePartnerPageOnly,
  pageFromSite,
  partnerPageFromSite,
  partnerPageState,
  partnerRolloutScopeError,
};
