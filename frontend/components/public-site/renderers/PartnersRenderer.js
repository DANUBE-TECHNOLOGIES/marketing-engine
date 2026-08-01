import {
  getItems,
  getSectionTitle,
} from "./helpers";

export default function PartnersRenderer({
  section,
}) {
  const items = getItems(section, [
    "items",
    "partners",
  ]);

  return (
    <section className="public-site-section public-site-partners">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Des partenaires de confiance"
          )}
        </h2>

        <div className="public-site-partners-grid">
          {items.length ? (
            items.map((item, index) => (
              <div
                key={
                  item.id ||
                  item.name ||
                  index
                }
              >
                {item.logo ? (
                  <img
                    src={item.logo}
                    alt={item.name || ""}
                  />
                ) : (
                  <strong>
                    {item.name ||
                      item.title}
                  </strong>
                )}
              </div>
            ))
          ) : (
            <p>
              Les partenaires de l’agence
              seront bientôt affichés ici.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
