import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

function defaultOffersTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Offres de voyages de votre agence à ${city}`
    : "Les offres de voyages à ne pas manquer";
}

function defaultOffersIntro(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Découvrez les offres sélectionnées par votre agence de voyages à ${city} et échangez avec un conseiller pour choisir le séjour adapté à votre projet.`
    : "Découvrez les offres sélectionnées par votre agence et échangez avec un conseiller pour choisir le séjour adapté à votre projet.";
}

export default function OffersRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "offers",
  ]);
  const introduction = content.text || content.introduction || content.description || defaultOffersIntro(site);

  return (
    <section className="public-site-section public-site-offers">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Bons plans
        </p>

        <h2>
          {getSectionTitle(
            section,
            defaultOffersTitle(site)
          )}
        </h2>

        {introduction ? (
          <p className="public-site-section-intro">{introduction}</p>
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
                    href={resolvePublicCtaHref(
                      site,
                      item.href,
                      "contact"
                    )}
                    className="public-site-inline-link"
                  >
                    {item.href
                      ? "Voir l’offre →"
                      : "Demander un devis →"}
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

export {
  defaultOffersIntro,
  defaultOffersTitle,
};
