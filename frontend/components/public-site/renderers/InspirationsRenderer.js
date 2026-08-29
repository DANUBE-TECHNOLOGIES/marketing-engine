import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
}

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function inspirationHref(site, item) {
  if (!site?.slug || !item?.slug) return null;
  return `/agence/${encodeURIComponent(site.slug)}/inspiration/${encodeURIComponent(item.slug)}`;
}

function inspirationTitle(item) {
  return String(item?.title || item?.name || "Inspiration voyage").trim();
}

function inspirationImage(item) {
  return item?.imageUrl || item?.image || item?.media?.url || null;
}

function inspirationImageAlt(item) {
  const configured = String(
    item?.imageAlt || item?.altText || item?.media?.altText || ""
  ).trim();
  if (configured) return configured;
  return `Inspiration voyage : ${inspirationTitle(item)}`;
}

function localIntroduction(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  if (!city) return "";
  const nearby = resolvedTargetCities(site, { limit: 3 });
  const area = nearby.length
    ? ` Ces contenus s’adressent aussi aux voyageurs de ${joinCities(nearby)} accompagnés par notre équipe.`
    : "";
  return `Préparez votre prochain voyage avec les conseils, idées de destinations et sélections de votre agence de voyages à ${city}.${area}`;
}

export default function InspirationsRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = getItems(section, ["items", "articles", "inspirations"]);
  const root = siteRoot(site);
  const city = String(site?.agency?.city || site?.city || "").trim();

  if (!items.length && content.showWhenEmpty !== true) {
    return null;
  }

  return (
    <section className="public-site-section public-site-inspirations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Conseils voyageurs</p>

        <h2>
          {getSectionTitle(
            section,
            city ? `Conseils voyage de votre agence à ${city}` : "Laissez-vous inspirer"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : city ? (
          <p className="public-site-section-intro">{localIntroduction(site)}</p>
        ) : null}

        {items.length ? (
          <div className="public-site-editorial-grid">
            {items.map((item, index) => {
              const href = inspirationHref(site, item);
              const title = inspirationTitle(item);
              const image = inspirationImage(item);
              const card = (
                <article className="public-site-editorial-card" key={item.id || item.slug || index}>
                  {image ? (
                    <div className="public-site-editorial-image">
                      <img
                        src={image}
                        alt={inspirationImageAlt(item)}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  ) : null}

                  <div>
                    {item.category ? <span>{item.category}</span> : null}
                    <h3>{title}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                    {href ? <strong>{`Lire ${title} →`}</strong> : null}
                  </div>
                </article>
              );

              return href ? (
                <Link
                  href={href}
                  key={item.id || item.slug || index}
                  className="public-site-editorial-link"
                  aria-label={city ? `Lire ${title}, conseil de notre agence de voyages à ${city}` : `Lire l'inspiration ${title}`}
                >
                  {card}
                </Link>
              ) : card;
            })}
          </div>
        ) : null}

        <nav
          className="public-site-related-links"
          aria-label={city ? `Explorer les conseils et services de notre agence à ${city}` : "Explorer les conseils et services de l'agence"}
        >
          <Link href={`${root}/destinations`}>
            {city ? `Destinations conseillées par notre agence à ${city}` : "Découvrir les destinations proposées par votre agence"}
          </Link>
          <Link href={`${root}/services`}>
            {city ? `Services de notre agence de voyages à ${city}` : "Voir les services de votre agence de voyages"}
          </Link>
          <Link href={`${root}/contact`}>
            {city ? `Contacter notre agence de voyages à ${city}` : "Contacter votre agence de voyages"}
          </Link>
        </nav>
      </div>
    </section>
  );
}

export {
  inspirationHref,
  inspirationImage,
  inspirationImageAlt,
  inspirationTitle,
  joinCities,
  localIntroduction,
  siteRoot,
};
