import { enrichSearchConsoleRows } from "./local-search-query-classifier";
import { searchConsoleCtr } from "./search-console-local-baseline";

export function rankLocalSearchOpportunities(rows = []) {
  return enrichSearchConsoleRows(rows)
    .map((row) => {
      const clicks = Number(row?.clicks) || 0;
      const impressions = Number(row?.impressions) || 0;
      const ctr = searchConsoleCtr({ clicks, impressions });
      const commercial = ["agency-local", "ticketing", "groups", "business", "service", "brand"].includes(row.intent);
      const opportunityScore = commercial
        ? Math.round(impressions * (1 - Math.min(1, ctr)) * 100) / 100
        : 0;
      return { ...row, clicks, impressions, ctr, commercial, opportunityScore };
    })
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.impressions - a.impressions);
}

export function topLocalSearchOpportunities(rows = [], limit = 10) {
  return rankLocalSearchOpportunities(rows)
    .filter((row) => row.commercial && row.impressions > 0)
    .slice(0, Math.max(0, limit));
}
