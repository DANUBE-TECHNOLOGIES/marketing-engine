export const LOCAL_SEARCH_KPIS = Object.freeze([
  "impressions",
  "clicks",
  "ctr",
  "position",
  "readinessScore",
  "priorityScore",
]);

export function localSearchKpiDefinition() {
  return {
    impressions: "Organic Google Search impressions for the scoped agency/query/page period.",
    clicks: "Organic Google Search clicks for the scoped agency/query/page period.",
    ctr: "Clicks divided by impressions.",
    position: "Average Google Search position when available.",
    readinessScore: "Local SEO configuration completeness score.",
    priorityScore: "Combined readiness gap and observed visibility opportunity.",
  };
}
