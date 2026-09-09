function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value) {
  const number = finiteNumber(value);
  if (number === null || number < 0) return 0;
  return Math.floor(number);
}

function isoDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeGoogleReviewSummary(summary) {
  const average = finiteNumber(summary?.averageRating);
  const total = positiveInteger(summary?.total);

  return {
    source: "Google Business Profile",
    averageRating: average !== null && average >= 0 && average <= 5 ? average : 0,
    total,
    latestPublishedAt: isoDateTime(summary?.latestPublishedAt),
    authoritative: Boolean(summary && typeof summary === "object"),
  };
}

export function visibleReviewFreshness(summary, reviews = []) {
  const normalized = normalizeGoogleReviewSummary(summary);
  if (normalized.latestPublishedAt) {
    return {
      value: normalized.latestPublishedAt,
      scope: "synchronized-summary",
    };
  }

  const dates = (Array.isArray(reviews) ? reviews : [])
    .map((review) => isoDateTime(review?.publishedAt))
    .filter(Boolean)
    .sort();

  return {
    value: dates.length ? dates.at(-1) : null,
    scope: dates.length ? "visible-subset" : "none",
  };
}

export const GOOGLE_SELF_SERVING_REVIEW_MARKUP_POLICY = Object.freeze({
  emitAggregateRatingOnAgency: false,
  emitReviewOnAgency: false,
  rationale: "Google self-serving review policy for LocalBusiness and Organization pages",
});
