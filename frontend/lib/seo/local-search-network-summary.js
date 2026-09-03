import { localSearchSummary } from "./local-search-summary";

export function localSearchNetworkSummary(items = []) {
  const agencies = items.map((item) => localSearchSummary(item));
  const ready = agencies.filter((agency) => agency.ready).length;
  const averageReadiness = agencies.length
    ? Math.round(agencies.reduce((sum, agency) => sum + agency.readinessScore, 0) / agencies.length)
    : 0;

  return {
    agencies,
    agencyCount: agencies.length,
    readyCount: ready,
    needsWorkCount: agencies.length - ready,
    averageReadiness,
    priorities: [...agencies].sort((a, b) => b.priorityScore - a.priorityScore),
  };
}
