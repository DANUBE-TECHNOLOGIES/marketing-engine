import { buildLocalIntentMap } from "./local-search-intent-map";

export function localSearchCoverage(site) {
  const entries = buildLocalIntentMap(site);
  const covered = entries.filter((entry) => entry.primaryQuery);
  return {
    total: entries.length,
    covered: covered.length,
    ratio: entries.length ? covered.length / entries.length : 0,
    missingRoutes: entries.filter((entry) => !entry.primaryQuery).map((entry) => entry.route),
    routes: entries,
  };
}
