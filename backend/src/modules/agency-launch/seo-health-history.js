"use strict";

const SEO_HEALTH_SNAPSHOT_LEVER = "seo_health_snapshot";

function encodeSnapshot(report, capturedAt = new Date()) {
  const health = report?.seoHealth || {};
  return JSON.stringify({
    schema: "seo-health-snapshot-v1",
    capturedAt: new Date(capturedAt).toISOString(),
    score: Number(health.score || 0),
    grade: health.grade || null,
    status: health.status || null,
    components: Array.isArray(health.components)
      ? health.components.map((item) => ({
          code: item.code,
          points: Number(item.points || 0),
          weight: Number(item.weight || 0),
          ratio: Number(item.ratio || 0),
        }))
      : [],
  });
}

function decodeSnapshot(action) {
  try {
    const data = JSON.parse(action?.comment || "{}");
    if (data?.schema !== "seo-health-snapshot-v1") return null;
    return {
      id: action.id,
      capturedAt: data.capturedAt || action.createdAt || null,
      score: Number(data.score || 0),
      grade: data.grade || null,
      status: data.status || null,
      components: Array.isArray(data.components) ? data.components : [],
    };
  } catch {
    return null;
  }
}

async function recordSeoHealthSnapshot(database, agencyId, report, capturedAt = new Date()) {
  return database.networkAction.create({
    data: {
      agencyId: Number(agencyId),
      lever: SEO_HEALTH_SNAPSHOT_LEVER,
      title: "Snapshot santé SEO",
      description: `Santé SEO ${report?.seoHealth?.score ?? 0}/100`,
      status: "done",
      comment: encodeSnapshot(report, capturedAt),
    },
  });
}

async function seoHealthHistory(database, tenantId, agencyId, limit = 120) {
  const rows = await database.networkAction.findMany({
    where: {
      agencyId: Number(agencyId),
      agency: { tenantId },
      lever: SEO_HEALTH_SNAPSHOT_LEVER,
    },
    orderBy: { createdAt: "desc" },
    take: Math.max(1, Math.min(Number(limit) || 120, 365)),
  });
  return rows.map(decodeSnapshot).filter(Boolean);
}

function latestAtOrBefore(history = [], targetDate) {
  const target = new Date(targetDate).getTime();
  return [...history]
    .filter((item) => item?.capturedAt && new Date(item.capturedAt).getTime() <= target)
    .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))[0] || null;
}

function seoHealthTrend(currentHealth, history = [], now = new Date()) {
  const currentScore = Number(currentHealth?.score || 0);
  const windows = [30, 60, 90].map((days) => {
    const target = new Date(now.getTime() - days * 86400000);
    const snapshot = latestAtOrBefore(history, target);
    return {
      days,
      comparable: Boolean(snapshot),
      baseline: snapshot,
      scoreDelta: snapshot ? Math.round((currentScore - Number(snapshot.score || 0)) * 10) / 10 : null,
    };
  });
  return { version: "1.0", currentScore, windows };
}

module.exports = {
  SEO_HEALTH_SNAPSHOT_LEVER,
  encodeSnapshot,
  decodeSnapshot,
  recordSeoHealthSnapshot,
  seoHealthHistory,
  latestAtOrBefore,
  seoHealthTrend,
};
