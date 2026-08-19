"use strict";

function partnerPageFromSite(site) {
  return (Array.isArray(site?.pages) ? site.pages : []).find(
    (page) => String(page?.slug || "").trim().toLowerCase() === "partenaires"
  ) || null;
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
    return {
      siteId: site.id,
      siteName: site.name,
      siteSlug: site.slug,
      siteStatus: site.status,
      agencyId: Number(site.agencyId),
      agencyName: site.agency?.name || site.name,
      city: site.agency?.city || "",
      partnerPageState: partnerPageState(page),
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
    version: "1.0",
    summary: {
      totalSites: rows.length,
      missing: rows.filter((row) => row.partnerPageState === "missing").length,
      published: rows.filter((row) => row.partnerPageState === "published").length,
      draftOrReview: rows.filter((row) => !["missing", "published"].includes(row.partnerPageState)).length,
    },
    sites: rows,
  };
}

async function ensureNetworkPartnerPages(service, input = {}) {
  if (input.confirmed !== true) {
    const error = new Error("Le rollout réseau de la page Partenaires exige une validation explicite.");
    error.statusCode = 400;
    error.code = "PARTNER_PAGE_NETWORK_CONFIRMATION_REQUIRED";
    throw error;
  }

  const before = await buildPartnerPageRolloutStatus(service);
  const targets = before.sites.filter((row) => row.partnerPageState === "missing");
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
    version: "1.0",
    dryRun: false,
    createdSiteCount: results.filter((result) => Number(result.created || 0) > 0).length,
    results,
    before: before.summary,
    after: after.summary,
  };
}

module.exports = {
  buildPartnerPageRolloutStatus,
  ensureNetworkPartnerPages,
  partnerPageFromSite,
  partnerPageState,
};
