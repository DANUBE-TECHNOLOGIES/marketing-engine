import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function InspirationsRenderer({
  section,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "articles",
    "inspirations",
  ]);

  return (
    <section className="public-site-section public-site-inspirations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Conseils voyageurs
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Laissez-vous inspirer"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-editorial-grid">
          {items.length ? (
            items.map((item, index) => (
              <article
                className="public-site-editorial-card"
                key={
                  item.id ||
                  item.slug ||
                  index
                }
              >
                {item.image ? (
                  <div
                    className="public-site-editorial-image"
                    style={{
                      backgroundImage: `url("${item.image}")`,
                    }}
                  />
                ) : null}

                <div>
                  {item.category ? (
                    <span>
                      {item.category}
                    </span>
                  ) : null}

                  <h3>
                    {item.title ||
                      "Inspiration voyage"}
                  </h3>

                  {item.description ? (
                    <p>{item.description}</p>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div className="public-site-empty-premium">
              <strong>
                De nouvelles inspirations seront bientôt publiées.
              </strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
