import Link from "next/link";
import { getSectionContent, getSectionTitle } from "./helpers";
import { buildGoogleMapsSearchUrl } from "../../../lib/public-agency-location";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";
import { pageHref, pageSlug, uniquePublishedNavigation } from "../PublicSiteHeader";

const RELATED_CONTACT_PAGE_SLUGS = new Set(["services", "destinations", "inspiration"]);

function phoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function localContactIntro(site) {
  const agency = site?.agency || {};
  const city = String(agency.city || site?.city || "").trim();
  const nearby = resolvedTargetCities(site, { limit: 3 });
  if (!city) return "Retrouvez les coordonnées publiques de votre agence.";
  const area = nearby.length
    ? ` Ce mini-site présente également l’agence pour les secteurs de ${joinCities(nearby)}.`
    : "";
  return `Retrouvez les coordonnées publiques de votre agence de voyages à ${city}.${area}`;
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_CONTACT_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

function ReviewExperienceCard({ agency, city }) {
  const reviewUrl = String(agency?.googleReviewUrl || "").trim();
  if (!reviewUrl) return null;

  return (
    <a
      className="public-site-agency-card public-site-agency-card-link"
      href={reviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={city ? `Déposer un avis Google sur l’agence de ${city}` : "Déposer un avis Google"}
    >
      <span className="public-site-agency-icon">★</span>
      <div>
        <small>Avis Google</small>
        <strong>{city ? `Agence de ${city}` : "Votre agence"}</strong>
        <span>{city ? `Déposer un avis Google sur l’agence de ${city} →` : "Déposer un avis Google →"}</span>
      </div>
    </a>
  );
}

export default function ContactRenderer({ section, site }) {
  const content = getSectionContent(section);
  const agency = site?.agency || {};
  const mapUrl = buildGoogleMapsSearchUrl(agency);
  const city = String(agency.city || site?.city || "").trim();
  const agencyName = agency.name || site.name;
  const relatedPages = relatedPublishedPages(site);

  return (
    <section id="contact" className="public-site-section public-site-contact">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Votre agence</p>
        <h2>{getSectionTitle(section, city ? `Contactez votre agence de voyages à ${city}` : "Contactez votre agence")}</h2>
        <p className="public-site-section-intro">{content.text || content.description || localContactIntro(site)}</p>

        <div className="public-site-agency-profile">
          {agency.address ? (
            <article className="public-site-agency-card">
              <span className="public-site-agency-icon">⌖</span>
              <div>
                <small>{city ? `Adresse de notre agence à ${city}` : "Adresse"}</small>
                <strong>{agencyName}</strong>
                <address>{agency.address}<br />{agency.postalCode} {agency.city}</address>
                {mapUrl ? <a href={mapUrl} target="_blank" rel="noopener noreferrer">{city ? `Itinéraire vers l’agence de ${city} →` : "Calculer l’itinéraire →"}</a> : null}
              </div>
            </article>
          ) : null}

          {agency.phone || agency.email ? (
            <article className="public-site-agency-card">
              <span className="public-site-agency-icon">☎</span>
              <div>
                {agency.phone ? <><small>{city ? `Téléphone de l’agence de ${city}` : "Téléphone"}</small><a className="public-site-agency-value" href={phoneHref(agency.phone)}>{agency.phone}</a></> : null}
                {agency.email ? <><small>E-mail</small><a href={`mailto:${agency.email}`}>{agency.email}</a></> : null}
              </div>
            </article>
          ) : null}

          <ReviewExperienceCard agency={agency} city={city} />
        </div>

        <div className="public-site-agency-actions">
          {agency.phone ? <a className="public-site-button" href={phoneHref(agency.phone)}>{city ? `Appeler l’agence de ${city}` : "Appeler l’agence"}</a> : null}
          {agency.email ? <a className="public-site-button public-site-button-outline" href={`mailto:${agency.email}`}>{city ? `Écrire à l’agence de ${city}` : "Envoyer un e-mail"}</a> : null}
        </div>

        {relatedPages.length ? (
          <nav className="public-site-related-links" aria-label="Pages publiées associées">
            {relatedPages.map((page) => <Link href={page.href} key={page.slug}>{page.title}</Link>)}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  RELATED_CONTACT_PAGE_SLUGS,
  ReviewExperienceCard,
  joinCities,
  localContactIntro,
  phoneHref,
  relatedPublishedPages,
};
