"use strict";

const RATING_MAP = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function sameDate(a, b) {
  const left = a ? new Date(a).getTime() : null;
  const right = b ? new Date(b).getTime() : null;
  return left === right;
}

function normalizeGoogleReview(review) {
  const googleReviewId = review?.reviewId || review?.name || null;
  if (!googleReviewId) return null;

  return {
    googleReviewId,
    authorName: review.reviewer?.displayName || "Client Google",
    rating: RATING_MAP[review.starRating] || Number(review.starRating) || 0,
    comment: review.comment || null,
    publishedAt: review.createTime ? new Date(review.createTime) : null,
    googleReply: review.reviewReply?.comment || null,
  };
}

function buildDesiredUpdate(existing, normalized) {
  const data = {
    authorName: normalized.authorName,
    rating: normalized.rating,
    comment: normalized.comment,
    publishedAt: normalized.publishedAt,
    source: "google",
  };

  if (normalized.googleReply) {
    data.reply = normalized.googleReply;
    data.status = "replied";
  } else if (existing.source === "google" && existing.status === "replied") {
    data.reply = null;
    data.status = "new";
  }

  const changed =
    existing.authorName !== data.authorName ||
    existing.rating !== data.rating ||
    (existing.comment || null) !== data.comment ||
    !sameDate(existing.publishedAt, data.publishedAt) ||
    existing.source !== data.source ||
    (Object.prototype.hasOwnProperty.call(data, "reply") &&
      (existing.reply || null) !== data.reply) ||
    (Object.prototype.hasOwnProperty.call(data, "status") &&
      existing.status !== data.status);

  return { changed, data };
}

function dedupeGoogleReviews(reviews) {
  const seen = new Set();
  return reviews.filter((review) => {
    if (!review.googleReviewId) return true;
    if (seen.has(review.googleReviewId)) return false;
    seen.add(review.googleReviewId);
    return true;
  });
}

function newestIsoDate(values) {
  let newest = null;

  for (const value of values) {
    if (!value) continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isFinite(timestamp)) continue;
    if (newest === null || timestamp > newest) newest = timestamp;
  }

  return newest === null ? null : new Date(newest).toISOString();
}

function calculateReviewSummary(reviews) {
  const total = reviews.length;
  const averageRating = total
    ? Math.round(
        (reviews.reduce((sum, review) => sum + review.rating, 0) / total) * 10
      ) / 10
    : 0;

  return { averageRating, total };
}

function buildReviewProof(reviews, { source, sourceUrl = null } = {}) {
  const summary = calculateReviewSummary(reviews);
  const normalizedSource = source || "local-fallback";
  const googleSnapshot = normalizedSource === "google";

  return {
    kind: "ReviewProof",
    version: "1.0.0",
    source: normalizedSource,
    provider: googleSnapshot ? "google_business_profile" : null,
    completeness: googleSnapshot ? "best-effort" : "local-fallback",
    sourceUrl: sourceUrl || null,
    averageRating: summary.averageRating,
    total: summary.total,
    latestReviewPublishedAt: newestIsoDate(
      reviews.map((review) => review.publishedAt || review.createdAt)
    ),
    snapshotLastChangedAt: newestIsoDate(
      reviews.map((review) => review.updatedAt || review.createdAt)
    ),
  };
}

class GoogleBusinessReviewsService {
  constructor(repository, provider) {
    this.repository = repository;
    this.provider = provider;
  }

  async syncTenant(tenantSlug = "mondescale") {
    const tenant = await this.repository.findTenantBySlug(tenantSlug);
    if (!tenant) {
      const error = new Error("Tenant introuvable.");
      error.statusCode = 404;
      error.code = "TENANT_NOT_FOUND";
      throw error;
    }

    const agencies = await this.repository.listGoogleAgencies(tenant.id);
    const summary = {
      success: true,
      imported: 0,
      reconciled: 0,
      unchanged: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    for (const agency of agencies) {
      try {
        // Google est lu en entier avant toute écriture pour cette agence.
        // Une erreur de pagination/API laisse donc son snapshot local intact.
        const googleReviews = await this.provider.listReviews(agency.googleLocationId);
        const agencyResult = {
          agency: agency.name,
          city: agency.city,
          found: googleReviews.length,
          imported: 0,
          reconciled: 0,
          unchanged: 0,
          skipped: 0,
        };

        for (const rawReview of googleReviews) {
          const normalized = normalizeGoogleReview(rawReview);
          if (!normalized || normalized.rating < 1) {
            summary.skipped++;
            agencyResult.skipped++;
            continue;
          }

          const known = await this.repository.findKnownReviews(
            agency.id,
            normalized.googleReviewId
          );

          if (known.length === 0) {
            await this.repository.createReview({
              agencyId: agency.id,
              authorName: normalized.authorName,
              rating: normalized.rating,
              comment: normalized.comment,
              reply: normalized.googleReply,
              status: normalized.googleReply ? "replied" : "new",
              source: "google",
              googleReviewId: normalized.googleReviewId,
              publishedAt: normalized.publishedAt,
            });
            summary.imported++;
            agencyResult.imported++;
            continue;
          }

          // Sans contrainte UNIQUE en base, le premier enregistrement est le
          // canonique. On ne détruit aucun doublon historique ; la lecture
          // publique les déduplique par googleReviewId.
          const canonical = known[0];
          const { changed, data } = buildDesiredUpdate(canonical, normalized);

          if (changed) {
            await this.repository.updateReview(canonical.id, data);
            summary.reconciled++;
            agencyResult.reconciled++;
          } else {
            summary.unchanged++;
            agencyResult.unchanged++;
          }
        }

        summary.details.push(agencyResult);
      } catch (error) {
        summary.success = false;
        summary.failed++;
        summary.details.push({
          agency: agency.name,
          city: agency.city,
          failed: true,
          error: error.message,
        });
      }
    }

    return summary;
  }

  async getPublic(siteSlug, tenantSlug = "mondescale", limit = 6) {
    const site = await this.repository.findPublicSite(siteSlug, tenantSlug);
    if (!site?.agency) {
      const error = new Error("Mini-site agence introuvable.");
      error.statusCode = 404;
      error.code = "PUBLIC_AGENCY_SITE_NOT_FOUND";
      throw error;
    }

    const allLocalReviews = await this.repository.listPublicReviews(site.agency.id);
    const syncedGoogle = dedupeGoogleReviews(
      allLocalReviews.filter(
        (review) => review.source === "google" && review.googleReviewId
      )
    );

    // Dès qu'un snapshot Google existe, il devient la source publique.
    // Sinon on conserve le jeu local historique comme fallback.
    const completeSet = syncedGoogle.length > 0 ? syncedGoogle : allLocalReviews;
    const source = syncedGoogle.length > 0 ? "google" : "local-fallback";
    const summary = calculateReviewSummary(completeSet);
    const reviewUrl = site.agency.googleReviewUrl || null;

    return {
      agency: {
        id: site.agency.id,
        name: site.agency.name,
        city: site.agency.city,
      },
      summary,
      proof: buildReviewProof(completeSet, {
        source,
        sourceUrl: reviewUrl,
      }),
      reviewUrl,
      reviews: completeSet.slice(0, limit).map((review) => ({
        id: review.id,
        authorName: review.authorName,
        rating: review.rating,
        comment: review.comment,
        reply: review.status === "replied" ? review.reply : null,
        publishedAt: review.publishedAt || review.createdAt,
        createdAt: review.createdAt,
        source: review.source,
      })),
    };
  }
}

module.exports = {
  GoogleBusinessReviewsService,
  normalizeGoogleReview,
  buildDesiredUpdate,
  dedupeGoogleReviews,
  calculateReviewSummary,
  buildReviewProof,
};
