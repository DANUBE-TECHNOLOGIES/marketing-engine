import Link from "next/link";

import HeroV2Renderer from "./renderers/HeroV2Renderer";
import {
  pageHref,
  pageSlug,
  publishedPageBySlug,
  uniquePublishedNavigation,
} from "./PublicSiteHeader";

const BUSINESS_TRAVEL_HERO_IMAGE =
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=2400&q=88";

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function businessTravelHero(site) {
  const city = cityName(site);
  const title = city ? `Voyages d’affaires à ${city}` : "Voyages d’affaires";

  return {
    id: "business-travel-hero",
    type: "hero",
    title,
    content: {
      __builderType: "hero",
      eyebrow: "Voyages professionnels",
      title,
      text: city
        ? `Retrouvez les informations publiques de l’agence de ${city} pour vos demandes liées aux déplacements professionnels.`
        : "Retrouvez les informations publiques de l’agence pour vos demandes liées aux déplacements professionnels.",
      backgroundImage: BUSINESS_TRAVEL_HERO_IMAGE,
      imageAlt: city
        ? `Voyages d’affaires à ${city}`
        : "Voyages d’affaires",
      backgroundPosition: "center 52%",
      overlayOpacity: 78,
      alignment: "left",
    },
  };
}

function publishedBusinessTravelLinks(site) {
  const pages = uniquePublishedNavigation(site);
  const contactPage = publishedPageBySlug(pages, "contact");
  const servicePage = publishedPageBySlug(pages, "services");

  return [contactPage, servicePage]
    .filter(Boolean)
    .filter((page, index, items) =>
      items.findIndex((candidate) => pageSlug(candidate) === pageSlug(page)) === index
    )
    .map((page) => ({
      href: pageHref(site.slug, page),
      title: page.title,
    }));
}

export default function BusinessTravelPage({ site }) {
  const city = cityName(site);
  const agency = site?.agency || {};
  const hero = businessTravelHero(site);
  const relatedLinks = publishedBusinessTravelLinks(site);

  return (
    <main className="public-site-business-travel">
      <HeroV2Renderer
        section={hero}
        site={site}
        page={{ slug: "business-travel", title: hero.title }}
        sharedNetworkHero
      />

      <section className="public-site-section public-site-page-heading">
        <div className="public-site-container public-site-prose">
          <p className="public-site-eyebrow">Voyages professionnels</p>
          <h2>{city ? `Contacter l’agence de ${city}` : "Contacter l’agence"}</h2>
          <p>
            Les prestations, conditions et dispositifs disponibles pour les voyages d’affaires peuvent varier. Utilisez uniquement les coordonnées et pages publiées ci-dessous pour connaître ce que cette agence propose actuellement.
          </p>

          <div className="public-site-related-links">
            {agency.phone ? <a href={`tel:${String(agency.phone).replace(/\s+/g, "")}`}>{agency.phone}</a> : null}
            {agency.email ? <a href={`mailto:${agency.email}`}>{agency.email}</a> : null}
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href}>{link.title}</Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export {
  BUSINESS_TRAVEL_HERO_IMAGE,
  businessTravelHero,
  cityName,
  publishedBusinessTravelLinks,
};
