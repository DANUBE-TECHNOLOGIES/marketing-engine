import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

import {
  getPublicReviews,
} from "../../../lib/public-reviews-api";

function stars(rating) {
  const normalized = Math.max(
    0,
    Math.min(
      5,
      Math.round(Number(rating) || 0)
    )
  );

  return "★".repeat(normalized) +
    "☆".repeat(5 - normalized);
}

function formatDate(value) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        month: "long",
        year: "numeric",
      }
    ).format(new Date(value));
  } catch {
    return null;
  }
}

function latestPublishedAt(reviews = []) {
  const dates = reviews
    .map((review) => review?.publishedAt)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()));

  if (!dates.length) {
    return null;
  }

  return new Date(
    Math.max(
      ...dates.map((date) => date.getTime())
    )
  ).toISOString();
}

function reviewInitial(authorName) {
  return String(authorName || "V")
    .trim()
    .charAt(0)
    .toUpperCase();
}

function compactText(value, limit = 260) {
  const text = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= limit) {
    return text;
  }

  const shortened = text.slice(0, limit);
  const lastSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(0, lastSpace > 170 ? lastSpace : limit).trim()}…`;
}

function isLongText(value, limit = 260) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .length > limit;
}

function defaultReviewsTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Les avis clients de notre agence à ${city}`
    : "Les avis clients de notre agence";
}

function defaultReviewsIntro(site, total) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  if (!total) return null;

  return city
    ? `Découvrez les retours publiés sur Google par les voyageurs accompagnés par notre agence de ${city}.`
    : "Découvrez les retours publiés sur Google par les voyageurs accompagnés par notre agence.";
}

function siteHref(site, slug) {
  const root = String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
  return `${root}/${slug}`;
}

export default async function ReviewsRenderer({
  section,
  site,
}) {
  const content =
    getSectionContent(section);

  let data = null;

  try {
    data = await getPublicReviews(
      site.slug,
      Number(content.limit) || 6
    );
  } catch {
    data = null;
  }

  const reviews =
    Array.isArray(data?.reviews)
      ? data.reviews
      : [];

  const averageRating =
    Number(data?.summary?.averageRating) ||
    0;

  const total =
    Number(data?.summary?.total) ||
    0;

  const introduction =
    content.text ||
    defaultReviewsIntro(site, total);

  const latestReview =
    data?.summary?.latestPublishedAt ||
    latestPublishedAt(reviews);

  const latestReviewLabel =
    formatDate(latestReview);

  return (
    <section className="public-site-section public-site-reviews">
      <div className="public-site-container">
        <div className="public-site-reviews-heading">
          <div className="public-site-reviews-heading-copy">
            <p className="public-site-section-kicker">
              Avis Google
            </p>

            <h2>
              {getSectionTitle(
                section,
                defaultReviewsTitle(site)
              )}
            </h2>

            {introduction ? (
              <p>{introduction}</p>
            ) : null}
          </div>

          {total > 0 ? (
            <div className="public-site-google-summary" aria-label={`Note Google ${averageRating.toFixed(1)} sur 5, ${total} avis`}>
              <span className="public-site-google-logo" aria-hidden="true">
                G
              </span>

              <div className="public-site-google-summary-copy">
                <span className="public-site-google-summary-label">
                  Note Google
                </span>

                <div className="public-site-google-summary-rating">
                  <strong>
                    {averageRating.toFixed(1)}
                  </strong>
                  <span>/ 5</span>
                </div>

                <span className="public-site-google-stars" aria-hidden="true">
                  {stars(averageRating)}
                </span>

                <small>
                  {total} avis clients
                </small>

                {latestReviewLabel ? (
                  <small>
                    Dernier avis affiché :{" "}
                    <time dateTime={latestReview}>
                      {latestReviewLabel}
                    </time>
                  </small>
                ) : null}
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

              return (
                <article
                  className="public-site-review-card"
                  key={review.id}
                >
                  <div className="public-site-review-card-top">
                    <span className="public-site-review-avatar">
                      {reviewInitial(review.authorName)}
                    </span>

                    <div className="public-site-review-author">
                      <strong>
                        {review.authorName || "Voyageur"}
                      </strong>

                      {publishedLabel ? (
                        <time dateTime={review.publishedAt}>
                          {publishedLabel}
                        </time>
                      ) : null}
                    </div>

                    <span className="public-site-review-google-mark" aria-label="Avis Google">
                      G
                    </span>
                  </div>

                  <p className="public-site-review-stars" aria-label={`${Number(review.rating) || 0} étoiles sur 5`}>
                    {stars(review.rating)}
                  </p>

                  {review.comment ? (
                    <blockquote className="public-site-review-excerpt">
                      {compactText(review.comment)}
                    </blockquote>
                  ) : null}

                  {longComment || hasReply ? (
                    <details className="public-site-review-details">
                      <summary>
                        {longComment
                          ? "Lire l’avis complet"
                          : "Voir la réponse de l’agence"}
                      </summary>

                      {longComment ? (
                        <blockquote className="public-site-review-fulltext">
                          {review.comment}
                        </blockquote>
                      ) : null}

                      {hasReply ? (
                        <div className="public-site-review-reply">
                          <strong>
                            Réponse de l’agence
                          </strong>

                          <p>{review.reply}</p>
                        </div>
                      ) : null}
                    </details>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="public-site-empty-premium">
            <strong>
              Les avis Google seront bientôt affichés ici.
            </strong>

            <p>
              L’agence est en cours de synchronisation
              avec Google Business Profile.
            </p>
          </div>
        )}

        {data?.reviewUrl ? (
          <div className="public-site-review-actions">
            <a
              className="public-site-button"
              href={data.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Déposer un avis Google
            </a>
          </div>
        ) : null}

        <div className="public-site-related-links" aria-label="Découvrir votre agence">
          <Link href={siteHref(site, "equipe")}>Rencontrer notre équipe</Link>
          <Link href={siteHref(site, "services")}>Découvrir nos services voyage</Link>
          <Link href={siteHref(site, "contact")}>Contacter votre agence</Link>
        </div>
      </div>
    </section>
  );
}

export {
  defaultReviewsIntro,
  defaultReviewsTitle,
  latestPublishedAt,
  siteHref,
};
