"use strict";

const { listPresenceProviders } = require("./provider-registry");
const { buildDiscoveryQueries } = require("./citation-discovery");

function normalizeBudget(value, fallback = 100) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
}

function buildNetworkDiscoveryPlan(agencies = [], options = {}) {
  const maxTasks = normalizeBudget(options.maxTasks, 100);
  const providerKeys = Array.isArray(options.providerKeys) && options.providerKeys.length
    ? new Set(options.providerKeys)
    : null;
  const providers = listPresenceProviders()
    .filter((provider) => provider.capabilities.includes("discover"))
    .filter((provider) => !providerKeys || providerKeys.has(provider.key));

  const seen = new Set();
  const jobs = [];
  let queryCount = 0;
  let skippedByBudget = 0;

  for (const agency of agencies) {
    for (const provider of providers) {
      const queries = buildDiscoveryQueries(agency, provider.key);
      if (!queries.length) continue;
      const jobQueries = [];
      for (const query of queries) {
        const key = `${provider.key}\u0000${query}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (queryCount >= maxTasks) {
          skippedByBudget += 1;
          continue;
        }
        jobQueries.push(query);
        queryCount += 1;
      }
      if (jobQueries.length) {
        jobs.push(Object.freeze({
          agencyId: agency.id,
          agencyName: agency.name,
          providerKey: provider.key,
          queries: Object.freeze(jobQueries)
        }));
      }
    }
  }

  return Object.freeze({
    budget: Object.freeze({ maxTasks, plannedTasks: queryCount, skippedByBudget }),
    agencyCount: agencies.length,
    providerCount: providers.length,
    jobCount: jobs.length,
    jobs: Object.freeze(jobs)
  });
}

module.exports = { buildNetworkDiscoveryPlan, normalizeBudget };
