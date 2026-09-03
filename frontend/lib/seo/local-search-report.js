import { localSearchReadiness } from "./local-search-readiness";
import { topLocalSearchOpportunities } from "./local-search-opportunities";

export function buildLocalSearchReport({ site, searchConsoleRows = [] }) {
  const readiness = localSearchReadiness(site);
  const opportunities = topLocalSearchOpportunities(searchConsoleRows, 10);

  return {
    agency: site?.name || site?.agency?.name || null,
    city: readiness.primaryCity,
    readinessScore: readiness.score,
    ready: readiness.ready,
    checks: readiness.checks,
    serviceAreas: readiness.serviceAreas,
    intentMap: readiness.intentMap,
    cannibalisation: readiness.duplicates,
    opportunities,
  };
}
