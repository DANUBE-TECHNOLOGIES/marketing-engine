import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function stars(rating) {
  const normalized = Math.max(
    0,
    Math.min(
      5,
      Math.round(Number(rating) || 5)
    )
  );

  return "★".repeat(normalized) +
    "☆".repeat(5 - normalized);
}

function normalizeLimit(value, fallback = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(24, Math.trunc(parsed)));
}

export default function TestimonialsRenderer({
  section,
}) {
  const content =
    getSectionContent(section);

  const limit = normalizeLimit(content.limit);

  const items =
    Array.isArray(content.items)
      ? content.items.slice(0, limit)
      : [];

  return (
    <section className="public-site-section public-site-reviews">
      <div className="public-site-container">
        <div className="public-site-reviews-heading">
          <div>
            <p className="public-site-section-kicker">
              Témoignages
            </p>

            <h2>
              {getSectionTitle(
                section,
                "Ils nous font confiance"
              )}
            </h2>
          </div>
        </div>

        {items.length ? (
          <div className="public-site-review-grid">
            {items.map((item, index) => (
              <article
                className="public-site-review-card"
                key={item.id || `${item.author || "client"}-${index}`}
              >
                <p className="public-site-review-stars">
                  {stars(item.rating)}
                </p>

                {item.text ? (
                  <blockquote>
                    {item.text}
                  </blockquote>
                ) : null}

                {item.author ? (
                  <strong>{item.author}</strong>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
