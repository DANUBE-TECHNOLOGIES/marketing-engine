import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

export default function PartnersRenderer({
  section,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "partners",
  ]);

  const sprite =
    content.sprite ||
    content.spriteUrl ||
    null;

  return (
    <section className="public-site-section public-site-partners">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Des partenaires de confiance"
          )}
        </h2>

        {content.text ? (
          <p className="public-site-section-intro">
            {content.text}
          </p>
        ) : null}

        {sprite ? (
          <div className="public-site-partners-sprite">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sprite}
              alt={
                content.spriteAlt ||
                items
                  .map((item) => item.name || item.title)
                  .filter(Boolean)
                  .join(", ")
              }
              loading="lazy"
              decoding="async"
            />

            {items.length ? (
              <ul className="public-site-visually-hidden">
                {items.map((item, index) => (
                  <li
                    key={
                      item.id ||
                      item.name ||
                      index
                    }
                  >
                    {item.name || item.title}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <div className="public-site-partners-grid">
            {items.length ? (
              items.map((item, index) => {
                const logo =
                  item.logo ||
                  item.logoUrl ||
                  item.imageUrl ||
                  null;

                return (
                  <div
                    key={
                      item.id ||
                      item.name ||
                      index
                    }
                  >
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logo}
                        alt={item.name || item.title || ""}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <strong>
                        {item.name ||
                          item.title}
                      </strong>
                    )}
                  </div>
                );
              })
            ) : (
              <p>
                Les partenaires de l’agence
                seront bientôt affichés ici.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
