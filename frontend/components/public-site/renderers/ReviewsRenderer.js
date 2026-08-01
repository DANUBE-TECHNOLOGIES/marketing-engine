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

  return (
    <section className="public-site-section public-site-reviews">
      <div className="public-site-container">
        <div className="public-site-reviews-heading">
          <div>
            <p className="public-site-section-kicker">
              Avis Google
            </p>

            <h2>
              {getSectionTitle(
                section,
                "Ils nous ont confié leurs voyages"
              )}
            </h2>

            {content.text ? (
              <p>{content.text}</p>
            ) : null}
          </div>

          {total > 0 ? (
            <div className="public-site-google-summary">
              <span className="public-site-google-logo">
                G
              </span>

              <div>
                <strong>
                  {averageRating.toFixed(1)}
                </strong>

                <span className="public-site-google-stars">
                  {stars(averageRating)}
                </span>

                <small>
                  {total} avis
                </small>
              </div>
            </div>
          ) : null}
        </div>

        {reviews.length ? (
          <div className="public-site-review-grid">
            {reviews.map((review) => (
              <article
                className="public-site-review-card"
                key={review.id}
              >
                <div className="public-site-review-card-top">
                  <span className="public-site-review-avatar">
                    {String(
                      review.authorName ||
                      "V"
                    )
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>

                  <div>
                    <strong>
                      {review.authorName ||
                        "Voyageur"}
                    </strong>

                    <small>
                      {formatDate(
                        review.publishedAt
                      )}
                    </small>
                  </div>
                </div>

                <p className="public-site-review-stars">
                  {stars(review.rating)}
                </p>

                {review.comment ? (
                  <blockquote>
                    {review.comment}
                  </blockquote>
                ) : null}

                {review.reply ? (
                  <div className="public-site-review-reply">
                    <strong>
                      Réponse de l’agence
                    </strong>

                    <p>{review.reply}</p>
                  </div>
                ) : null}
              </article>
            ))}
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
      </div>
    </section>
  );
}
