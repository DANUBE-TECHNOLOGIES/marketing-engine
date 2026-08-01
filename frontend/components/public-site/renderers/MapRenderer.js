import {
  getSectionTitle,
} from "./helpers";

export default function MapRenderer({
  section,
  site,
}) {
  const agency =
    site?.agency || {};

  const query = encodeURIComponent(
    [
      agency.name || site.name,
      agency.address,
      agency.postalCode,
      agency.city,
    ]
      .filter(Boolean)
      .join(" ")
  );

  if (!query) {
    return null;
  }

  return (
    <section className="public-site-section public-site-map">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Nous trouver
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Venir à l’agence"
          )}
        </h2>

        <div className="public-site-map-frame">
          <iframe
            title={`Carte ${agency.name || site.name}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="public-site-map-address">
          <strong>
            {agency.name || site.name}
          </strong>

          {agency.address ? (
            <span>
              {agency.address},{" "}
              {agency.postalCode}{" "}
              {agency.city}
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}
