import { localSearchReadiness } from "./local-search-readiness";
import { topLocalSearchOpportunities } from "./local-search-opportunities";

export function localSearchPriority({ site, searchConsoleRows = [] }) {
  const readiness = localSearchReadiness(site);
  const opportunities = topLocalSearchOpportunities(searchConsoleRows, 5);
  const visibility = opportunities.reduce((sum, row) => sum + row.opportunityScore, 0);
  const readinessGap = 100 - readiness.score;
  const score = Math.round((readinessGap * 2 + visibility) * 100) / 100;

  return {
    score,
    readinessGap,
    visibilityOpportunity: Math.round(visibility * 100) / 100,
    city: readiness.primaryCity,
    ready: readiness.ready,
    topOpportunities: opportunities,
  };
}

export function rankAgenciesForLocalSearch(items = []) {
  return items
    .map((item) => ({ ...item, priority: localSearchPriority(item) }))
    .sort((a, b) => b.priority.score - a.priority.score);
}
