import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

import {
  buildGoogleMapsSearchUrl,
} from "../../../lib/public-agency-location";
import {
  resolvedTargetCities,
} from "../../../lib/seo/local-area-config";

function phoneHref(phone) {
  return `tel:${String(phone || "")
    .replace(/\s+/g, "")}`;
}

function siteHref(site, slug) {
  const root = String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
  return `${root}/${slug}`;
}

function localContactIntro(site) {
  const agency = site?.agency || {};
  const city = String(agency.city || site?.city || "").trim();
  const nearby = resolvedTargetCities(site, { limit: 3 });

  if (!city) {
    return "Contactez votre agence pour échanger avec un conseiller et préparer votre prochain voyage.";
  }

  const area = nearby.length
    ? ` Nous accompagnons également les voyageurs de ${nearby.join(", ")}.`
    : "";

  return `Contactez directement votre agence de voyages à ${city} pour préparer votre projet avec un conseiller local.${area}`;
}

export default function ContactRenderer({
  section,
  site,
}) {
  const content =
    getSectionContent(section);

  const agency =
    site?.agency || {};

  const mapUrl =
    buildGoogleMapsSearchUrl(
      agency
    );

  const city =
    String(
      agency.city ||
      site?.city ||
      ""
    ).trim();

  return (
    <section
      id="contact"
      className="public-site-section public-site-contact"
    >
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Votre agence
        </p>

        <h2>
          {getSectionTitle(
            section,
            city
              ? `Contactez votre agence de voyages à ${city}`
              : "Contactez votre agence"
          )}
        </h2>

        <p className="public-site-section-intro">
          {content.text || content.description || localContactIntro(site)}
        </p>

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
                <address>
                  {agency.address}
                  <br />
                  {agency.postalCode}{" "}
                  {agency.city}
                </address>
              ) : (
                <p>
                  Adresse en cours de mise à jour.
                </p>
              )}

              {mapUrl ? (
                <a
                  href={mapUrl}
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

        <div className="public-site-related-links" aria-label="Continuer à préparer votre voyage">
          <Link href={siteHref(site, "services")}>Découvrir nos services voyage</Link>
          <Link href={siteHref(site, "destinations")}>Explorer nos destinations</Link>
          <Link href={siteHref(site, "inspiration")}>Lire nos inspirations voyage</Link>
        </div>
      </div>
    </section>
  );
}

export {
  localContactIntro,
  phoneHref,
  siteHref,
};
