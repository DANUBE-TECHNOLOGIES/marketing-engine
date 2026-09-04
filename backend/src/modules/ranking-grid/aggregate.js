"use strict";

function ratio(count, total) {
  return total ? Math.round((count / total) * 1000) / 1000 : 0;
}

function summarizePoints(points = []) {
  const items = Array.isArray(points) ? points : [];
  const measured = items.filter((point) => point && point.status !== "error");
  const found = measured.filter((point) => point.found === true && Number.isFinite(Number(point.position)));
  const positions = found.map((point) => Number(point.position));
  const top3 = positions.filter((position) => position <= 3).length;
  const top10 = positions.filter((position) => position <= 10).length;
  const top20 = positions.filter((position) => position <= 20).length;
  const averagePosition = positions.length
    ? Math.round((positions.reduce((sum, value) => sum + value, 0) / positions.length) * 100) / 100
    : null;

  return {
    totalPoints: items.length,
    measuredPoints: measured.length,
    errorPoints: items.length - measured.length,
    foundPoints: found.length,
    presenceRate: ratio(found.length, measured.length),
    top3Points: top3,
    top3Rate: ratio(top3, measured.length),
    top10Points: top10,
    top10Rate: ratio(top10, measured.length),
    top20Points: top20,
    top20Rate: ratio(top20, measured.length),
    averagePosition,
    bestPosition: positions.length ? Math.min(...positions) : null,
    worstPosition: positions.length ? Math.max(...positions) : null,
  };
}

module.exports = { summarizePoints };
