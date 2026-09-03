import { buildLocalSearchReport } from "./local-search-report";
import { localSearchRecommendations } from "./local-search-recommendations";
import { localSearchPriority } from "./local-search-priority";

export function localSearchSummary({ site, searchConsoleRows = [] }) {
  const input = { site, searchConsoleRows };
  const report = buildLocalSearchReport(input);
  const priority = localSearchPriority(input);
  const recommendations = localSearchRecommendations(input);

  return {
    agency: report.agency,
    city: report.city,
    ready: report.ready,
    readinessScore: report.readinessScore,
    priorityScore: priority.score,
    visibilityOpportunity: priority.visibilityOpportunity,
    recommendations,
    topOpportunities: priority.topOpportunities,
  };
}
