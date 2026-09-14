import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function normalizedRating(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(5, Math.round(parsed)));
}

function stars(rating) {
  const normalized = normalizedRating(rating);
  if (normalized == null) return null;
  return "★".repeat(normalized) +
    "☆".repeat(5 - normalized);
}

function normalizeLimit(value, fallback = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

export default function TestimonialsRenderer({ section }) {
  const content = getSectionContent(section);
  const limit = normalizeLimit(content.limit);
  const items = Array.isArray(content.items)
    ? content.items
      .filter((item) => item?.text || item?.author || normalizedRating(item?.rating) != null)
      .slice(0, limit)
    : [];

  if (!items.length) return null;

  return (
    <section className="public-site-section public-site-reviews">
      <div className="public-site-container">
        <div className="public-site-reviews-heading">
          <div>
            <p className="public-site-section-kicker">Témoignages publiés</p>
            <h2>{getSectionTitle(section, "Témoignages")}</h2>
          </div>
        </div>

        <div className="public-site-review-grid">
          {items.map((item, index) => {
            const ratingStars = stars(item.rating);
            return (
              <article
                className="public-site-review-card"
                key={item.id || `${item.author || "testimonial"}-${index}`}
              >
                {ratingStars ? (
                  <p className="public-site-review-stars" aria-label={`${normalizedRating(item.rating)} étoiles sur 5`}>
                    {ratingStars}
                  </p>
                ) : null}

                {item.text ? <blockquote>{item.text}</blockquote> : null}
                {item.author ? <strong>{item.author}</strong> : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export {
  normalizedRating,
  normalizeLimit,
  stars,
};
