import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function phoneHref(phone) {
  return `tel:${String(phone || "")
    .replace(/\s+/g, "")}`;
}

function mapUrl(agency) {
  const query = encodeURIComponent(
    [
      agency.name,
      agency.address,
      agency.postalCode,
      agency.city,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export default function ContactRenderer({
  section,
  site,
}) {
  const content =
    getSectionContent(section);

  const agency =
    site?.agency || {};

  return (
    <section className="public-site-section public-site-contact">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Votre agence
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Contactez votre agence"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-agency-profile">
          <article className="public-site-agency-card">
            <span className="public-site-agency-icon">
              ⌖
            </span>

            <div>
              <small>Adresse</small>

              <strong>
                {agency.name || site.name}
              </strong>

              {agency.address ? (
                <p>
                  {agency.address}
                  <br />
                  {agency.postalCode}{" "}
                  {agency.city}
                </p>
              ) : (
                <p>
                  Adresse en cours de mise à jour.
                </p>
              )}

              {agency.address ? (
                <a
                  href={mapUrl(agency)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Calculer l’itinéraire →
                </a>
              ) : null}
            </div>
          </article>

          <article className="public-site-agency-card">
            <span className="public-site-agency-icon">
              ☎
            </span>

            <div>
              <small>Téléphone</small>

              {agency.phone ? (
                <a
                  className="public-site-agency-value"
                  href={phoneHref(
                    agency.phone
                  )}
                >
                  {agency.phone}
                </a>
              ) : (
                <p>
                  Numéro en cours de mise à jour.
                </p>
              )}

              <small>E-mail</small>

              {agency.email ? (
                <a
                  href={`mailto:${agency.email}`}
                >
                  {agency.email}
                </a>
              ) : null}
            </div>
          </article>

          <article className="public-site-agency-card">
            <span className="public-site-agency-icon">
              ★
            </span>

            <div>
              <small>Votre expérience</small>

              <strong>
                Vous avez voyagé avec nous ?
              </strong>

              <p>
                Votre avis aide les futurs
                voyageurs à choisir leur agence.
              </p>

              {agency.googleReviewUrl ? (
                <a
                  href={
                    agency.googleReviewUrl
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Déposer un avis Google →
                </a>
              ) : null}
            </div>
          </article>
        </div>

        <div className="public-site-agency-actions">
          {agency.phone ? (
            <a
              className="public-site-button"
              href={phoneHref(
                agency.phone
              )}
            >
              Appeler l’agence
            </a>
          ) : null}

          {agency.email ? (
            <a
              className="public-site-button public-site-button-outline"
              href={`mailto:${agency.email}`}
            >
              Envoyer un e-mail
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
