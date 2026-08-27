"use strict";

const { buildNetworkCoverage } = require("./network-coverage");
const { getProviderReadiness } = require("./provider-readiness");

function buildNetworkProviderMatrix(agencies = [], directories = [], listings = [], env = process.env) {
  const coverage = buildNetworkCoverage(agencies, directories, listings);
  const providerKeys = [...new Set(coverage.rows.map((row) => row.providerKey).filter(Boolean))];
  const providers = providerKeys.map((providerKey) => ({ providerKey, readiness: getProviderReadiness(providerKey, env) }));
  const rows = coverage.rows.map((row) => {
    const readiness = getProviderReadiness(row.providerKey, env);
    return Object.freeze({
      ...row,
      operationalMode: readiness?.operationalMode || "blocked",
      providerReady: readiness?.ready === true,
      providerStage: readiness?.stage || "unknown",
      actionable: row.status !== "validated" && ["managed_api", "submission_api", "manual"].includes(readiness?.operationalMode),
      automationEligible: row.status !== "validated" && ["managed_api", "submission_api"].includes(readiness?.operationalMode) && readiness?.ready === true
    });
  });
  const summary = {
    cells: rows.length,
    validated: rows.filter((row) => row.status === "validated").length,
    actionable: rows.filter((row) => row.actionable).length,
    automationEligible: rows.filter((row) => row.automationEligible).length,
    blocked: rows.filter((row) => row.status !== "validated" && row.operationalMode === "blocked").length,
    manual: rows.filter((row) => row.status !== "validated" && row.operationalMode === "manual").length,
    monitorOnly: rows.filter((row) => row.status !== "validated" && row.operationalMode === "monitor").length
  };
  return Object.freeze({ summary: Object.freeze(summary), providers: Object.freeze(providers.map(Object.freeze)), rows: Object.freeze(rows) });
}

module.exports = { buildNetworkProviderMatrix };
