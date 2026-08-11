import {
  getSectionTitle,
} from "./helpers";

import {
  getPublicHours,
} from "../../../lib/public-hours-api";

const DAY_LABELS = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

function formatPeriods(periods) {
  if (
    !Array.isArray(periods) ||
    periods.length === 0
  ) {
    return "Fermé";
  }

  return periods
    .map(
      (period) =>
        `${period.openTime} – ${period.closeTime}`
    )
    .join(" / ");
}

function formatSyncedAt(value) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(value));
  } catch {
    return null;
  }
}

function defaultHoursTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Horaires de notre agence à ${city}`
    : "Horaires de l’agence";
}

export default async function HoursRenderer({
  section,
  site,
}) {
  const data =
    await getPublicHours(site.slug);

  if (!data) {
    return null;
  }

  const weekly =
    Array.isArray(data.weekly)
      ? data.weekly
      : [];
  const syncedLabel = formatSyncedAt(data.syncedAt);

  return (
    <section className="public-site-section public-site-hours">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Informations pratiques
        </p>

        <h2>
          {getSectionTitle(
            section,
            defaultHoursTitle(site)
          )}
        </h2>

        <div className="public-site-hours-layout">
          <div className="public-site-hours-status-card">
            <span
              className={[
                "public-site-hours-status-dot",
                data.status?.isOpen
                  ? "is-open"
                  : "is-closed",
              ].join(" ")}
            />

            <div>
              <small>
                Statut actuel
              </small>

              <strong>
                {data.status?.label ||
                  "Horaires indisponibles"}
              </strong>

              <p>
                Fuseau horaire :{" "}
                {data.timezone ||
                  "Europe/Paris"}
              </p>
            </div>
          </div>

          <div className="public-site-hours-table">
            {weekly.map((day) => (
              <div
                className="public-site-hours-row"
                key={day.day}
              >
                <strong>
                  {DAY_LABELS[day.day] ||
                    day.day}
                </strong>

                <span>
                  {formatPeriods(
                    day.periods
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {data.syncedAt && syncedLabel ? (
          <p className="public-site-hours-sync">
            Horaires synchronisés avec Google Business Profile le{" "}
            <time dateTime={data.syncedAt}>
              {syncedLabel}
            </time>
          </p>
        ) : (
          <p className="public-site-hours-sync">
            Horaires en attente de synchronisation
            Google Business Profile.
          </p>
        )}
      </div>
    </section>
  );
}

export {
  defaultHoursTitle,
};
