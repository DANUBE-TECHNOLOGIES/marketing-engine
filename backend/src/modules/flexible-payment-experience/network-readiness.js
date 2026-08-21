"use strict";

const {
  hasFlexiblePaymentBlock,
  normalizePaymentPolicy,
  planPaymentPlacements,
} = require("./payment-experience");

function hasPersistedPolicy(site = {}) {
  return Boolean(site.paymentPolicy && typeof site.paymentPolicy === "object");
}

function countDeployedBlocks(site = {}) {
  const pages = Array.isArray(site.pages) ? site.pages : [];
  return pages.reduce((count, page) => count + (hasFlexiblePaymentBlock(page) ? 1 : 0), 0);
}

function assessFlexiblePaymentSiteReadiness(site = {}) {
  const configured = hasPersistedPolicy(site);
  const policy = normalizePaymentPolicy(site.paymentPolicy || {});
  const deployedBlocks = countDeployedBlocks(site);

  if (!configured) {
    return {
      siteId: site.id || null,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "unconfigured",
      configured: false,
      enabled: false,
      deployedBlocks,
      proposals: 0,
      reasons: ["payment-policy-missing"],
    };
  }

  if (!policy.enabled) {
    return {
      siteId: site.id || null,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "disabled",
      configured: true,
      enabled: false,
      deployedBlocks,
      proposals: 0,
      reasons: ["payment-policy-disabled"],
    };
  }

  if (policy.products.length === 0) {
    return {
      siteId: site.id || null,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "invalid",
      configured: true,
      enabled: true,
      deployedBlocks,
      proposals: 0,
      reasons: ["payment-policy-products-missing"],
    };
  }

  const plan = planPaymentPlacements({ site, policy });
  const proposals = plan.proposals.length;

  if (proposals > 0) {
    return {
      siteId: site.id || null,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "ready",
      configured: true,
      enabled: true,
      deployedBlocks,
      proposals,
      reasons: [],
    };
  }

  if (deployedBlocks > 0) {
    return {
      siteId: site.id || null,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "deployed",
      configured: true,
      enabled: true,
      deployedBlocks,
      proposals: 0,
      reasons: [],
    };
  }

  return {
    siteId: site.id || null,
    slug: site.slug || null,
    agencyId: site.agencyId || null,
    status: "no-eligible-page",
    configured: true,
    enabled: true,
    deployedBlocks: 0,
    proposals: 0,
    reasons: ["no-published-home-or-flight-page"],
  };
}

function buildFlexiblePaymentNetworkReadiness(sites = []) {
  const rows = (Array.isArray(sites) ? sites : []).map(assessFlexiblePaymentSiteReadiness);
  const total = rows.length;
  const configured = rows.filter((row) => row.configured).length;
  const enabled = rows.filter((row) => row.enabled).length;
  const ready = rows.filter((row) => row.status === "ready").length;
  const deployed = rows.filter((row) => row.status === "deployed").length;
  const covered = ready + deployed;

  return {
    version: "mse-25.34",
    readOnly: true,
    writes: false,
    summary: {
      total,
      configured,
      enabled,
      ready,
      deployed,
      blocked: Math.max(total - covered, 0),
      coveragePercent: total ? Math.round((covered / total) * 10000) / 100 : 0,
    },
    sites: rows,
  };
}

module.exports = {
  assessFlexiblePaymentSiteReadiness,
  buildFlexiblePaymentNetworkReadiness,
  countDeployedBlocks,
  hasPersistedPolicy,
};
