import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function FeaturesV2Renderer({
  section,
}) {
  const content = getSectionContent(section);
  const items = Array.isArray(content.items)
    ? content.items
    : [];
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
          <div className="public-site-card-grid">
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
