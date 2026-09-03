import { localSearchMetricKey } from "./local-search-agency-key";
import { classifyLocalSearchQuery } from "./local-search-query-classifier";
import { searchConsoleCtr } from "./search-console-local-baseline";

export function normalizeLocalSearchObservation({ site, row, period }) {
  const query = String(row?.query || "").trim();
  const clicks = Number(row?.clicks) || 0;
  const impressions = Number(row?.impressions) || 0;
  const position = Number.isFinite(Number(row?.position)) ? Number(row.position) : null;

  return {
    key: localSearchMetricKey(site, query),
    agencyKey: localSearchMetricKey(site, "agency")?.split(":")[0] || null,
    query,
    intent: classifyLocalSearchQuery(query),
    clicks,
    impressions,
    ctr: searchConsoleCtr({ clicks, impressions }),
    position,
    period: period || null,
  };
}
