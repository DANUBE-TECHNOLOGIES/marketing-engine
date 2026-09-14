import Link from "next/link";
import { getSectionTitle } from "./helpers";
import { pageHref, pageSlug, uniquePublishedNavigation } from "../PublicSiteHeader";

const RELATED_MAP_PAGE_SLUGS = new Set(["contact", "equipe", "services"]);

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_MAP_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

function locationQueryParts(site) {
  const agency = site?.agency || {};
  const hasLocationFact = Boolean(agency.address || agency.postalCode || agency.city || site?.city);
  if (!hasLocationFact) return [];
  return [agency.name || site?.name, agency.address, agency.postalCode, agency.city || site?.city]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export default function MapRenderer({ section, site }) {
  const agency = site?.agency || {};
  const city = String(agency.city || site?.city || "").trim();
  const queryParts = locationQueryParts(site);
  if (!queryParts.length) return null;

  const query = encodeURIComponent(queryParts.join(" "));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const relatedPages = relatedPublishedPages(site);
  const agencyName = agency.name || site?.name;

  return (
    <section className="public-site-section public-site-map">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Localisation</p>
        <h2>{getSectionTitle(section, city ? `Localisation de notre agence à ${city}` : "Localisation de l’agence")}</h2>
        <p className="public-site-section-intro">
          {city ? `Retrouvez la localisation publiée de notre agence à ${city}.` : "Retrouvez la localisation publiée de votre agence."}
        </p>
        <div className="public-site-map-frame">
          <iframe
            title={`Carte ${agencyName || "de l’agence"}`}
            src={`https://www.google.com/maps?q=${query}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <div className="public-site-map-address">
          <div>
            {agencyName ? <strong>{agencyName}</strong> : null}
            {agency.address ? <span>{agency.address}, {agency.postalCode} {agency.city}</span> : null}
          </div>
          <a className="public-site-button public-site-button-outline" href={mapsUrl} target="_blank" rel="noopener noreferrer">Voir sur Google Maps</a>
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
  RELATED_MAP_PAGE_SLUGS,
  locationQueryParts,
  relatedPublishedPages,
};
