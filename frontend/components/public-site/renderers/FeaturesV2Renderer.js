import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function columnCount(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) return 3;

  return Math.min(4, Math.max(1, Math.round(parsed)));
}

export default function FeaturesV2Renderer({
  section,
}) {
  const content = getSectionContent(section);
  const items = Array.isArray(content.items)
    ? content.items
    : [];
  const columns = columnCount(content.columns);
  const introduction =
    content.introduction ||
    content.text ||
    content.description ||
    "";

  return (
    <section className="public-site-section public-site-features">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Les points forts"
          )}
        </h2>

        {introduction ? (
          <p className="public-site-section-intro">
            {introduction}
          </p>
        ) : null}

        {items.length ? (
          <div
            className="public-site-card-grid"
            style={{
              gridTemplateColumns:
                `repeat(${columns}, minmax(0, 1fr))`,
            }}
          >
            {items.map((item, index) => (
              <article
                className="public-site-card public-site-feature-card"
                key={item.id || item.title || index}
              >
                {item.icon ? (
                  <span className="public-site-feature-icon">
                    {item.icon}
                  </span>
                ) : null}

                <h3>{item.title || item.label}</h3>

                {item.text ? <p>{item.text}</p> : null}
                {item.description ? (
                  <p>{item.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  columnCount,
};
