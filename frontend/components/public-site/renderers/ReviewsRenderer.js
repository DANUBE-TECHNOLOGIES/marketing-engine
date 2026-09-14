import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

import {
  getPublicReviews,
} from "../../../lib/public-reviews-api";
import {
  normalizeGoogleReviewSummary,
  visibleReviewFreshness,
} from "../../../lib/seo/google-review-provenance";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";

const RELATED_REVIEW_PAGE_SLUGS = new Set(["services", "contact"]);

function stars(rating) {
  const normalized = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return "★".repeat(normalized) + "☆".repeat(5 - normalized);
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(value));
  } catch {
    return null;
  }
}

function latestPublishedAt(reviews = []) {
  return visibleReviewFreshness(null, reviews).value;
}

function reviewInitial(authorName) {
  return String(authorName || "").trim().charAt(0).toUpperCase();
}

function compactText(value, limit = 260) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const shortened = text.slice(0, limit);
  const lastSpace = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, lastSpace > 170 ? lastSpace : limit).trim()}…`;
}

function isLongText(value, limit = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().length > limit;
}

function defaultReviewsTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city ? `Les avis clients de notre agence à ${city}` : "Les avis clients de notre agence";
}

function defaultReviewsIntro(site, total) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  if (!total) return null;
  return city
    ? `Découvrez les avis Google publiés pour notre agence de ${city}.`
    : "Découvrez les avis Google publiés pour notre agence.";
}

function isHomePage(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function reviewLimit(content, page) {
  const configured = Number(content?.limit);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return isHomePage(page) ? 3 : 6;
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_REVIEW_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

export default async function ReviewsRenderer({ section, site, page }) {
  const content = getSectionContent(section);
  let data = null;

  try {
    data = await getPublicReviews(site.slug, reviewLimit(content, page));
  } catch {
    data = null;
  }

  const reviews = Array.isArray(data?.reviews) ? data.reviews : [];
  const summary = normalizeGoogleReviewSummary(data?.summary);
  const averageRating = summary.averageRating;
  const total = summary.total;
  const introduction = content.text || defaultReviewsIntro(site, total);
  const freshness = visibleReviewFreshness(data?.summary, reviews);
  const latestReview = freshness.value;
  const latestReviewLabel = formatDate(latestReview);
  const freshnessLabel = freshness.scope === "synchronized-summary"
    ? "Dernier avis Google synchronisé"
    : "Dernier avis affiché";
  const relatedPages = relatedPublishedPages(site);
  const reviewUrl = String(data?.reviewUrl || "").trim();
  const hasPublishedReviewData = total > 0 || reviews.length > 0;

  if (!hasPublishedReviewData && !reviewUrl && !introduction) return null;

  return (
    <section className="public-site-section public-site-reviews" data-review-source="google-business-profile">
      <div className="public-site-container">
        <div className="public-site-reviews-heading">
          <div className="public-site-reviews-heading-copy">
            <p className="public-site-section-kicker">Avis Google</p>
            <h2>{getSectionTitle(section, defaultReviewsTitle(site))}</h2>
            {introduction ? <p>{introduction}</p> : null}
          </div>

          {total > 0 ? (
            <div className="public-site-google-summary" aria-label={`Note Google ${averageRating.toFixed(1)} sur 5, ${total} avis`}>
              <span className="public-site-google-logo" aria-hidden="true">G</span>
              <div className="public-site-google-summary-copy">
                <span className="public-site-google-summary-label">Note Google</span>
                <div className="public-site-google-summary-rating"><strong>{averageRating.toFixed(1)}</strong><span>/ 5</span></div>
                <span className="public-site-google-stars" aria-hidden="true">{stars(averageRating)}</span>
                <small>{total} avis clients</small>
                <small>Source : Google Business Profile</small>
                {latestReviewLabel ? <small>{freshnessLabel} : <time dateTime={latestReview}>{latestReviewLabel}</time></small> : null}
              </div>
            </div>
          ) : null}
        </div>

        {reviews.length ? (
          <div className="public-site-review-grid">
            {reviews.map((review) => {
              const longComment = isLongText(review.comment);
              const hasReply = Boolean(review.reply);
              const publishedLabel = formatDate(review.publishedAt);
              const authorName = String(review.authorName || "").trim();
              const initial = reviewInitial(authorName);
              return (
                <article className="public-site-review-card" key={review.id}>
                  <div className="public-site-review-card-top">
                    {initial ? <span className="public-site-review-avatar">{initial}</span> : null}
                    <div className="public-site-review-author">
                      {authorName ? <strong>{authorName}</strong> : null}
                      {publishedLabel ? <time dateTime={review.publishedAt}>{publishedLabel}</time> : null}
                    </div>
                    <span className="public-site-review-google-mark" aria-label="Avis Google">G</span>
                  </div>
                  <p className="public-site-review-stars" aria-label={`${Number(review.rating) || 0} étoiles sur 5`}>{stars(review.rating)}</p>
                  {review.comment ? <blockquote className="public-site-review-excerpt">{compactText(review.comment)}</blockquote> : null}
                  {longComment || hasReply ? (
                    <details className="public-site-review-details">
                      <summary>{longComment ? "Lire l’avis complet" : "Voir la réponse de l’agence"}</summary>
                      {longComment ? <blockquote className="public-site-review-fulltext">{review.comment}</blockquote> : null}
                      {hasReply ? <div className="public-site-review-reply"><strong>Réponse de l’agence</strong><p>{review.reply}</p></div> : null}
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}

        {reviewUrl ? (
          <div className="public-site-review-actions">
            <a className="public-site-button" href={reviewUrl} target="_blank" rel="noopener noreferrer">Déposer un avis Google</a>
          </div>
        ) : null}

        {relatedPages.length ? (
          <nav className="public-site-related-links" aria-label="Pages publiées associées">
            {relatedPages.map((relatedPage) => (
              <Link href={relatedPage.href} key={relatedPage.slug}>{relatedPage.title}</Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  RELATED_REVIEW_PAGE_SLUGS,
  defaultReviewsIntro,
  defaultReviewsTitle,
  isHomePage,
  latestPublishedAt,
  relatedPublishedPages,
  reviewInitial,
  reviewLimit,
};
