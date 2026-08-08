import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function OffersRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "offers",
  ]);

  return (
    <section className="public-site-section public-site-offers">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Bons plans
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Les offres à ne pas manquer"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-offer-grid">
          {items.length ? (
            items.map((item, index) => (
              <article
                className="public-site-offer-card"
                key={
                  item.id ||
                  item.title ||
                  index
                }
              >
                {item.image ? (
                  <div
                    className="public-site-offer-image"
                    style={{
                      backgroundImage: `url("${item.image}")`,
                    }}
                  />
                ) : null}

                <div className="public-site-offer-content">
                  {item.badge ? (
                    <span className="public-site-offer-badge">
                      {item.badge}
                    </span>
                  ) : null}

                  <h3>
                    {item.title ||
                      item.name ||
                      "Voyage"}
                  </h3>

                  {item.description ? (
                    <p>{item.description}</p>
                  ) : null}

                  {item.price ? (
                    <strong className="public-site-offer-price">
                      À partir de {item.price}
                    </strong>
                  ) : null}

                  <a
                    href={`/agence/${site.slug}/contact`}
                    className="public-site-inline-link"
                  >
                    Demander un devis →
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div className="public-site-empty-premium">
              <strong>
                Les prochaines offres arrivent bientôt.
              </strong>

              <p>
                Contactez votre agence pour connaître
                les meilleures opportunités du moment.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
