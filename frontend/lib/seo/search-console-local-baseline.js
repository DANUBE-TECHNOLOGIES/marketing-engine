export const SEARCH_CONSOLE_LOCAL_BASELINE_2026_09_03 = Object.freeze([
  { query: "agence de voyage nevers", clicks: 3, impressions: 42 },
  { query: "agence de voyage gien", clicks: 1, impressions: 10 },
  { query: "agence de voyage dax", clicks: 0, impressions: 64 },
  { query: "agence voyage dax", clicks: 0, impressions: 21 },
  { query: "agence voyages nevers", clicks: 0, impressions: 19 },
  { query: "agence de voyage colombes", clicks: 0, impressions: 17 },
  { query: "agence de voyage clermont ferrand", clicks: 0, impressions: 12 },
  { query: "agence voyage nevers", clicks: 0, impressions: 11 },
  { query: "agence de voyage bois colombes", clicks: 0, impressions: 9 },
  { query: "fram nevers", clicks: 0, impressions: 10 },
  { query: "fram gien", clicks: 0, impressions: 8 },
  { query: "agence de voyage chantilly", clicks: 0, impressions: 6 },
  { query: "agence de voyage maurepas", clicks: 0, impressions: 3 },
]);

export function searchConsoleCtr({ clicks = 0, impressions = 0 } = {}) {
  return impressions > 0 ? clicks / impressions : 0;
}

export function localBaselineOpportunities(rows = SEARCH_CONSOLE_LOCAL_BASELINE_2026_09_03) {
  return rows
    .map((row) => ({ ...row, ctr: searchConsoleCtr(row) }))
    .sort((a, b) => b.impressions - a.impressions || a.ctr - b.ctr);
}
