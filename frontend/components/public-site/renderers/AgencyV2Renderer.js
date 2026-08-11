import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

const DAY_LABELS = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

function phoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

function mapUrl(agency, site) {
  const query = encodeURIComponent(
    [
      agency?.name || site?.name,
      agency?.address,
      agency?.postalCode,
      agency?.city,
    ]
      .filter(Boolean)
      .join(" ")
  );

  return query
    ? `https://www.google.com/maps/search/?api=1&query=${query}`
    : null;
}

function hasHours(hours) {
  return Boolean(
    hours &&
    typeof hours === "object" &&
    !Array.isArray(hours)
  );
}

function formatPeriods(periods) {
  if (!Array.isArray(periods) || !periods.length) {
    return "Fermé";
  }

  return periods
    .map(
      (period) =>
        `${period.openTime} – ${period.closeTime}`
    )
    .join(" / ");
}

function defaultAgencySectionTitle(agency) {
  const city = String(agency?.city || "").trim();
  return city
    ? `Votre agence de voyages à ${city}`
    : "Votre agence de voyages";
}

export default function AgencyV2Renderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const agency = site?.agency || {};
  const hours = site?.hours || agency?.hours || null;
  const weekly = Array.isArray(hours?.weekly)
    ? hours.weekly
    : [];

  const showAddress = content.showAddress !== false;
  const showPhone = content.showPhone !== false;
  const showEmail = content.showEmail !== false;
  const showHours = content.showHours !== false;
  const showMap = content.showMap === true;

  const directionsUrl = mapUrl(agency, site);

  return (
    <section className="public-site-section public-site-agency-section">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Votre agence
        </p>

        <h2>
          {getSectionTitle(
            section,
            defaultAgencySectionTitle(agency)
          )}
        </h2>

        {content.text ? <p>{content.text}</p> : null}

        <div className="public-site-agency-profile">
          {showAddress && agency.address ? (
            <article className="public-site-agency-card">
              <span className="public-site-agency-icon">⌖</span>
              <div>
                <small>Adresse</small>
                <strong>{agency.name || site?.name}</strong>
                <address>
                  {agency.address}
                  <br />
                  {agency.postalCode} {agency.city}
                </address>

                {directionsUrl ? (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Calculer l’itinéraire →
                  </a>
                ) : null}
              </div>
            </article>
          ) : null}

          {(showPhone && agency.phone) ||
          (showEmail && agency.email) ? (
            <article className="public-site-agency-card">
              <span className="public-site-agency-icon">☎</span>
              <div>
                {showPhone && agency.phone ? (
                  <>
                    <small>Téléphone</small>
                    <a
                      className="public-site-agency-value"
                      href={phoneHref(agency.phone)}
                    >
                      {agency.phone}
                    </a>
                  </>
                ) : null}

                {showEmail && agency.email ? (
                  <>
                    <small>E-mail</small>
                    <a href={`mailto:${agency.email}`}>
                      {agency.email}
                    </a>
                  </>
                ) : null}
              </div>
            </article>
          ) : null}

          {showHours && hasHours(hours) ? (
            <article className="public-site-agency-card">
              <span className="public-site-agency-icon">◷</span>
              <div>
                <small>Horaires</small>

                <strong>
                  {hours.status?.label ||
                    "Horaires de l’agence"}
                </strong>

                {weekly.length ? (
                  <div className="public-site-hours-table">
                    {weekly.map((day) => (
                      <div
                        className="public-site-hours-row"
                        key={day.day}
                      >
                        <strong>
                          {DAY_LABELS[day.day] || day.day}
                        </strong>
                        <span>
                          {formatPeriods(day.periods)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </article>
          ) : null}
        </div>

        {showMap && directionsUrl ? (
          <div className="public-site-map-frame">
            <iframe
              title={`Carte ${agency.name || site?.name || "de l’agence"}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                [
                  agency.name || site?.name,
                  agency.address,
                  agency.postalCode,
                  agency.city,
                ]
                  .filter(Boolean)
                  .join(" ")
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  defaultAgencySectionTitle,
};
