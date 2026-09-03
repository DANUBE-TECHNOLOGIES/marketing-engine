"use strict";

const WINDOWS = [30, 60, 90];

function networkRankingVisibilityTrend(items = []) {
  const rows = (items || []).filter((item) => item?.agency?.id);
  const windows = WINDOWS.map((days) => {
    const agencyWindows = rows
      .map((item) => {
        const rankings = (item.checks || []).find((check) => check?.code === "LOCAL_RANKINGS");
        const window = rankings?.visibilityTrend?.windows?.find((entry) => entry?.days === days);
        if (!window?.comparable) return null;
        return {
          agency: item.agency,
          top10Delta: Number(window.top10Delta || 0),
          top20Delta: Number(window.top20Delta || 0),
          past: window.past || null,
        };
      })
      .filter(Boolean);

    const top10Delta = agencyWindows.reduce((sum, row) => sum + row.top10Delta, 0);
    const top20Delta = agencyWindows.reduce((sum, row) => sum + row.top20Delta, 0);
    const improvingAgencies = agencyWindows.filter((row) => row.top10Delta > 0 || row.top20Delta > 0).length;
    const decliningAgencies = agencyWindows.filter((row) => row.top10Delta < 0 || row.top20Delta < 0).length;

    return {
      days,
      comparableAgencies: agencyWindows.length,
      comparable: agencyWindows.length > 0,
      top10Delta: agencyWindows.length ? top10Delta : null,
      top20Delta: agencyWindows.length ? top20Delta : null,
      improvingAgencies,
      decliningAgencies,
      agencies: agencyWindows,
    };
  });

  return {
    version: "1.0",
    windows,
  };
}

module.exports = { WINDOWS, networkRankingVisibilityTrend };
