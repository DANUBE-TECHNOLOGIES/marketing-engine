"use strict";

const { fingerprint } = require("./network-rollout");
const { assessFlexiblePaymentSiteReadiness, countDeployedBlocks } = require("./network-readiness");

const SOURCE = "mse-25.38";

function siteOperationalRow(site = {}) {
  const readiness = assessFlexiblePaymentSiteReadiness(site);
  const deployedBlocks = countDeployedBlocks(site);
  const anomalies = [];

  if (readiness.enabled && readiness.status === "ready" && deployedBlocks > 0) {
    anomalies.push("ready-with-existing-blocks");
  }

  if (!readiness.enabled && deployedBlocks > 0) {
    anomalies.push("blocks-present-while-policy-disabled");
  }

  if (!readiness.configured && deployedBlocks > 0) {
    anomalies.push("blocks-present-without-persisted-policy");
  }

  let health = "healthy";
  if (["unconfigured", "invalid", "no-eligible-page"].includes(readiness.status)) {
    health = "blocked";
  } else if (readiness.status === "disabled" || anomalies.length) {
    health = "attention";
  }

  return {
    siteId: readiness.siteId,
    slug: readiness.slug,
    agencyId: readiness.agencyId,
    readinessStatus: readiness.status,
    configured: readiness.configured,
    enabled: readiness.enabled,
    deployedBlocks,
    proposals: readiness.proposals,
    health,
    anomalies,
  };
}

function buildFlexiblePaymentOperationalStatus(sites = []) {
  const rows = (Array.isArray(sites) ? sites : [])
    .map(siteOperationalRow)
    .sort((a, b) => String(a.siteId || a.slug || "").localeCompare(String(b.siteId || b.slug || "")));

  const summary = {
    total: rows.length,
    healthy: rows.filter((row) => row.health === "healthy").length,
    attention: rows.filter((row) => row.health === "attention").length,
    blocked: rows.filter((row) => row.health === "blocked").length,
    deployedSites: rows.filter((row) => row.deployedBlocks > 0).length,
    deployedBlocks: rows.reduce((sum, row) => sum + row.deployedBlocks, 0),
    anomalySites: rows.filter((row) => row.anomalies.length > 0).length,
  };

  const payload = {
    version: SOURCE,
    readOnly: true,
    writes: false,
    summary,
    sites: rows,
  };

  return {
    ...payload,
    fingerprint: fingerprint(payload),
  };
}

module.exports = {
  SOURCE,
  buildFlexiblePaymentOperationalStatus,
  siteOperationalRow,
};
