const SCORE_VERSION = "mse-local-seo-v1";

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function points(condition, value) {
  return condition ? value : 0;
}

function contentScore(row, { minimumWords = 140, strongWords = 280 } = {}) {
  const words = Math.max(0, Number(row.wordCount || row.words || 0));
  let depth = 0;
  if (words >= strongWords) depth = 18;
  else if (words >= minimumWords) depth = 14;
  else if (words >= 90) depth = 9;
  else if (words >= 50) depth = 5;

  return clamp(
    depth +
    points(Boolean(row.h1), 4) +
    points(Number(row.h1Count || 0) === 1, 3),
    0,
    25
  );
}

function technicalScore(row) {
  return clamp(
    points(Boolean(row.title), 5) +
    points(Boolean(row.description), 5) +
    points(Boolean(row.canonical) && (!row.url || row.canonical === row.url), 5) +
    points(!/noindex/i.test(String(row.robots || "")), 4) +
    points(Boolean(row.hasWebPage), 4) +
    points(Boolean(row.hasBreadcrumb), 3) +
    points(Boolean(row.ogTitle) && Boolean(row.ogDescription), 2) +
    points(Boolean(row.ogImage), 2),
    0,
    30
  );
}

function localScore(row) {
  const localRequired = row.localSignalRequired !== false;
  return clamp(
    points(Boolean(row.hasTravelAgency), 6) +
    points(Boolean(row.hasNap), 7) +
    points(Boolean(row.city), 3) +
    points(!localRequired || Boolean(row.cityInTitle), 4) +
    points(!localRequired || Boolean(row.cityInH1), 3) +
    points(!localRequired || Boolean(row.cityInText), 4) +
    points(Boolean(row.hasAreaServed), 3),
    0,
    30
  );
}

function mediaScore(row) {
  return clamp(
    points(Boolean(row.hasPrimaryImage), 5) +
    points(Boolean(row.ogImage), 4) +
    points(Boolean(row.hasAgencyImage), 3) +
    points(Boolean(row.hasAgencyLogo), 3),
    0,
    15
  );
}

export function scoreLocalSeoPage(row, options = {}) {
  const technical = technicalScore(row);
  const local = localScore(row);
  const content = contentScore(row, options);
  const media = mediaScore(row);
  const total = clamp(technical + local + content + media);

  const grade =
    total >= 90 ? "A" :
    total >= 80 ? "B" :
    total >= 70 ? "C" :
    total >= 55 ? "D" : "E";

  return {
    version: SCORE_VERSION,
    total,
    grade,
    dimensions: {
      technical,
      local,
      content,
      media,
    },
  };
}

export function aggregateLocalSeoSite(rows, options = {}) {
  const scored = rows.map((row) => ({
    ...row,
    score: row.score || scoreLocalSeoPage(row, options),
  }));
  if (!scored.length) {
    return {
      version: SCORE_VERSION,
      total: 0,
      grade: "E",
      pages: 0,
      dimensions: { technical: 0, local: 0, content: 0, media: 0 },
    };
  }

  const priorityWeight = (kind) => {
    if (kind === "home") return 2;
    if (["services", "contact", "avis", "reviews", "equipe", "team"].includes(kind)) return 1.35;
    return 1;
  };

  let weightSum = 0;
  let total = 0;
  const dimensions = { technical: 0, local: 0, content: 0, media: 0 };

  for (const row of scored) {
    const weight = priorityWeight(row.pageKind || row.kind);
    weightSum += weight;
    total += row.score.total * weight;
    for (const key of Object.keys(dimensions)) {
      dimensions[key] += row.score.dimensions[key] * weight;
    }
  }

  const resultTotal = Math.round(total / weightSum);
  for (const key of Object.keys(dimensions)) {
    dimensions[key] = Math.round(dimensions[key] / weightSum);
  }

  return {
    version: SCORE_VERSION,
    total: resultTotal,
    grade:
      resultTotal >= 90 ? "A" :
      resultTotal >= 80 ? "B" :
      resultTotal >= 70 ? "C" :
      resultTotal >= 55 ? "D" : "E",
    pages: scored.length,
    dimensions,
  };
}

export { SCORE_VERSION, clamp, contentScore, localScore, mediaScore, technicalScore };
