import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function DestinationsRenderer({
  section,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "destinations",
  ]);

  return (
    <section className="public-site-section public-site-destinations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Inspirations
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Nos destinations du moment"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-destination-grid">
          {items.length ? (
            items.map((item, index) => (
              <article
                className="public-site-destination-card"
                key={
                  item.id ||
                  item.slug ||
                  item.title ||
                  index
                }
                style={
                  item.image
                    ? {
                        backgroundImage: `
                          linear-gradient(
                            rgba(8, 31, 52, 0.12),
                            rgba(8, 31, 52, 0.78)
                          ),
                          url("${item.image}")
                        `,
                      }
                    : undefined
                }
              >
                <div>
                  {item.eyebrow ? (
                    <span>{item.eyebrow}</span>
                  ) : null}

                  <h3>
                    {item.title ||
                      item.name ||
                      "Destination"}
                  </h3>

                  {item.description ? (
                    <p>{item.description}</p>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <>
              <article className="public-site-destination-card">
                <div>
                  <span>Océan Indien</span>
                  <h3>Île Maurice</h3>
                </div>
              </article>

              <article className="public-site-destination-card">
                <div>
                  <span>Évasion</span>
                  <h3>Maldives</h3>
                </div>
              </article>

              <article className="public-site-destination-card">
                <div>
                  <span>Découverte</span>
                  <h3>Japon</h3>
                </div>
              </article>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
