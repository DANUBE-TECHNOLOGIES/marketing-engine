import Link from "next/link";
import { getSectionTitle } from "./helpers";
import { getPublicHours } from "../../../lib/public-hours-api";
import { pageHref, pageSlug, uniquePublishedNavigation } from "../PublicSiteHeader";

const DAY_LABELS = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

const RELATED_HOURS_PAGE_SLUGS = new Set(["contact", "services"]);

function formatPeriods(periods) {
  if (!Array.isArray(periods) || !periods.length) return "Fermé";
  return periods
    .map((period) => `${period.openTime} – ${period.closeTime}`)
    .join(" / ");
}

function formatSyncedAt(value) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

function defaultHoursTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city ? `Horaires de notre agence à ${city}` : "Horaires de l’agence";
}

function factualHoursIntroduction(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Consultez les horaires publiés de votre agence de voyages à ${city}.`
    : "Consultez les horaires publiés de votre agence.";
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_HOURS_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

export default async function HoursRenderer({ section, site }) {
  let data = null;
  try {
    data = await getPublicHours(site.slug);
  } catch {
    data = null;
  }
  if (!data) return null;

  const weekly = Array.isArray(data.weekly) ? data.weekly : [];
  const syncedLabel = formatSyncedAt(data.syncedAt);
  const city = String(site?.agency?.city || site?.city || "").trim();
  const relatedPages = relatedPublishedPages(site);

  return (
    <section className="public-site-section public-site-hours">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Informations pratiques</p>
        <h2>{getSectionTitle(section, defaultHoursTitle(site))}</h2>
        <p className="public-site-section-intro">{factualHoursIntroduction(site)}</p>

        <div className="public-site-hours-layout">
          <div className="public-site-hours-status-card">
            <span
              className={[
                "public-site-hours-status-dot",
                data.status?.isOpen ? "is-open" : "is-closed",
              ].join(" ")}
            />
            <div>
              <small>Statut actuel</small>
              <strong>{data.status?.label || "Horaires indisponibles"}</strong>
              <p>{city ? `Agence de ${city}` : data.timezone ? `Fuseau horaire : ${data.timezone}` : null}</p>
            </div>
          </div>

          <div className="public-site-hours-table">
            {weekly.map((day) => (
              <div className="public-site-hours-row" key={day.day}>
                <strong>{DAY_LABELS[day.day] || day.day}</strong>
                <span>{formatPeriods(day.periods)}</span>
              </div>
            ))}
          </div>
        </div>

        {data.syncedAt && syncedLabel ? (
          <p className="public-site-hours-sync">
            Horaires synchronisés avec Google Business Profile le{" "}
            <time dateTime={data.syncedAt}>{syncedLabel}</time>
          </p>
        ) : null}

        {relatedPages.length ? (
          <nav className="public-site-related-links" aria-label="Pages publiées associées">
            {relatedPages.map((page) => (
              <Link href={page.href} key={page.slug}>
                {page.title}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  RELATED_HOURS_PAGE_SLUGS,
  defaultHoursTitle,
  factualHoursIntroduction,
  formatPeriods,
  formatSyncedAt,
  relatedPublishedPages,
};
