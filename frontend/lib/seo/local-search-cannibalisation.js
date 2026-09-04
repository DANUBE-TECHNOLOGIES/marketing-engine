import { LOCAL_SEARCH_MEASUREMENT_THRESHOLDS } from "./local-search-measurement.js";

export const LOCAL_SEARCH_CANNIBALISATION_THRESHOLDS = Object.freeze({
  minimumImpressions: LOCAL_SEARCH_MEASUREMENT_THRESHOLDS.minimumImpressionsForCtrJudgement,
  minimumPageShare: 0.2,
  minimumSignificantPages: 2,
});

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeQuery(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function groupKey(row) {
  const agencyKey = String(row?.agencyKey || "").trim().toLowerCase();
  const query = normalizeQuery(row?.query);
  return agencyKey && query ? `${agencyKey}::${query}` : null;
}

export function detectObservedLocalSearchCannibalisation(
  rows = [],
  thresholds = LOCAL_SEARCH_CANNIBALISATION_THRESHOLDS,
) {
  const groups = new Map();

  for (const row of Array.isArray(rows) ? rows : []) {
    if (row?.attribution !== "attributed") continue;
    const key = groupKey(row);
    const page = String(row?.page || "").trim();
    if (!key || !page) continue;

    if (!groups.has(key)) {
      groups.set(key, {
        agencyKey: String(row.agencyKey).trim().toLowerCase(),
        query: String(row.query || "").trim(),
        pages: new Map(),
      });
    }

    const group = groups.get(key);
    const current = group.pages.get(page) || { page, impressions: 0, clicks: 0 };
    current.impressions += finite(row?.impressions);
    current.clicks += finite(row?.clicks);
    group.pages.set(page, current);
  }

  const conflicts = [];

  for (const group of groups.values()) {
    const pages = [...group.pages.values()];
    const impressions = pages.reduce((sum, page) => sum + page.impressions, 0);
    if (impressions < thresholds.minimumImpressions) continue;

    const pageDetails = pages
      .map((page) => ({
        ...page,
        share: impressions > 0 ? page.impressions / impressions : 0,
      }))
      .sort((left, right) => right.impressions - left.impressions || left.page.localeCompare(right.page));

    const significantPages = pageDetails.filter(
      (page) => page.impressions > 0 && page.share >= thresholds.minimumPageShare,
    );

    if (significantPages.length < thresholds.minimumSignificantPages) continue;

    conflicts.push({
      agencyKey: group.agencyKey,
      query: group.query,
      impressions,
      pageCount: pageDetails.length,
      significantPageCount: significantPages.length,
      pages: pageDetails,
      recommendation: "consolidate-existing-page-intent",
    });
  }

  return conflicts.sort((left, right) =>
    left.agencyKey.localeCompare(right.agencyKey) || right.impressions - left.impressions || left.query.localeCompare(right.query)
  );
}
