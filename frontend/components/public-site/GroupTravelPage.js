import Link from "next/link";

import styles from "./GroupTravelPage.module.css";
import {
  pageHref,
  pageSlug,
  publishedPageBySlug,
  uniquePublishedNavigation,
} from "./PublicSiteHeader";

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function publishedGroupTravelLinks(site) {
  const pages = uniquePublishedNavigation(site);
  const contactPage = publishedPageBySlug(pages, "contact");
  const servicePage = publishedPageBySlug(pages, "services");
  const destinationPage = publishedPageBySlug(pages, "destinations");

  return [contactPage, servicePage, destinationPage]
    .filter(Boolean)
    .filter((page, index, items) =>
      items.findIndex((candidate) => pageSlug(candidate) === pageSlug(page)) === index
    )
    .map((page) => ({
      href: pageHref(site.slug, page),
      title: page.title,
    }));
}

export default function GroupTravelPage({ site }) {
  const city = cityName(site);
  const agency = site?.agency || {};
  const relatedLinks = publishedGroupTravelLinks(site);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.eyebrow}>Voyages en groupe</p>
          <h1>{city ? `Voyages en groupe à ${city}` : "Voyages en groupe"}</h1>
          <p className={styles.heroText}>
            {city
              ? `Retrouvez les informations publiques de l’agence de ${city} pour vos demandes liées aux voyages en groupe.`
              : "Retrouvez les informations publiques de l’agence pour vos demandes liées aux voyages en groupe."}
          </p>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionHeaderCentered}>
            <p className={styles.eyebrow}>Informations de l’agence</p>
            <h2>{city ? `Contacter l’agence de ${city}` : "Contacter l’agence"}</h2>
            <p>
              Les prestations, destinations, capacités et conditions disponibles pour les voyages en groupe peuvent varier. Utilisez uniquement les coordonnées et pages publiées ci-dessous pour connaître ce que cette agence propose actuellement.
            </p>
          </div>

          <div className={styles.ctaPanel}>
            <div className={styles.ctaContent}>
              <div className="public-site-related-links">
                {agency.phone ? (
                  <a href={`tel:${String(agency.phone).replace(/\s+/g, "")}`}>{agency.phone}</a>
                ) : null}
                {agency.email ? <a href={`mailto:${agency.email}`}>{agency.email}</a> : null}
                {relatedLinks.map((link) => (
                  <Link key={link.href} href={link.href}>{link.title}</Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export { cityName, publishedGroupTravelLinks };
