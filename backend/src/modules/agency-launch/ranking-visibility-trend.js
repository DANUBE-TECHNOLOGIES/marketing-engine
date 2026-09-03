"use strict";

const WINDOWS = [30, 60, 90];

function positionAtOrBefore(results = [], targetDate) {
  const target = new Date(targetDate).getTime();
  return [...results]
    .filter((item) => item?.checkedAt && new Date(item.checkedAt).getTime() <= target)
    .sort((a, b) => new Date(b.checkedAt) - new Date(a.checkedAt))[0] || null;
}

function snapshot(keywords = [], targetDate) {
  const positions = keywords.map((keyword) => {
    const result = positionAtOrBefore(keyword.results || [], targetDate);
    const position = Number.isFinite(Number(result?.position)) ? Number(result.position) : null;
    return { keywordId: keyword.id, position, found: Boolean(result?.found), checkedAt: result?.checkedAt || null };
  });
  const measured = positions.filter((item) => item.checkedAt);
  return {
    measuredKeywords: measured.length,
    top10Keywords: measured.filter((item) => item.position != null && item.position <= 10).length,
    top20Keywords: measured.filter((item) => item.position != null && item.position <= 20).length,
  };
}

function rankingVisibilityTrend(keywords = [], now = new Date()) {
  const current = snapshot(keywords, now);
  const windows = WINDOWS.map((days) => {
    const target = new Date(now.getTime() - days * 86400000);
    const past = snapshot(keywords, target);
    const comparable = past.measuredKeywords > 0;
    return {
      days,
      date: target.toISOString(),
      comparable,
      past,
      top10Delta: comparable ? current.top10Keywords - past.top10Keywords : null,
      top20Delta: comparable ? current.top20Keywords - past.top20Keywords : null,
    };
  });
  return { version: "1.0", current, windows };
}

module.exports = { WINDOWS, positionAtOrBefore, snapshot, rankingVisibilityTrend };
