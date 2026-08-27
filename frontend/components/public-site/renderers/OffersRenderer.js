import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";
import { resolvedTargetCities } from "../../../lib/seo/local-area-config";

function joinCities(values) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values[values.length - 1]}`;
}

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
}

function defaultOffersTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Offres de voyages de votre agence à ${city}`
    : "Les offres de voyages à ne pas manquer";
}

function defaultOffersIntro(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  const nearby = resolvedTargetCities(site, { limit: 3 });

  if (!city) {
    return "Découvrez les offres sélectionnées par votre agence et échangez avec un conseiller pour choisir le séjour adapté à votre projet.";
  }

  const area = nearby.length
    ? ` L’agence conseille aussi les voyageurs de ${joinCities(nearby)}.`
    : "";

  return `Découvrez les offres sélectionnées par votre agence de voyages à ${city} et échangez avec un conseiller pour choisir le séjour adapté à votre projet.${area}`;
}

function offerImage(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [
    item.imageUrl,
    item.image,
    item.coverImage,
    item.heroImage,
    item.thumbnail,
    item.photo,
    item.media?.url,
    item.image?.url,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function offerImageAlt(item) {
  const explicit = String(item?.imageAlt || item?.alt || "").trim();
  if (explicit) return explicit;
  const title = String(item?.title || item?.name || "").trim();
  return title ? `Illustration de l’offre ${title}` : "";
}

function offerLinkLabel(item) {
  const title = String(item?.title || item?.name || "ce voyage").trim();
  return item?.href
    ? `Voir l’offre ${title}`
    : `Demander un devis pour ${title}`;
}

export default function OffersRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = getItems(section, ["items", "offers"]);
  const introduction = content.text || content.introduction || content.description || defaultOffersIntro(site);
  const root = siteRoot(site);

  return (
    <section className="public-site-section public-site-offers">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Bons plans</p>
        <h2>{getSectionTitle(section, defaultOffersTitle(site))}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}

        <div className="public-site-offer-grid">
          {items.length ? (
            items.map((item, index) => {
              const image = offerImage(item);
              const label = offerLinkLabel(item);
              return (
                <article className="public-site-offer-card" key={item.id || item.title || index}>
                  {image ? (
                    <div className="public-site-offer-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={offerImageAlt(item)}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        width="720"
                        height="480"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    </div>
                  ) : null}

                  <div className="public-site-offer-content">
                    {item.badge ? <span className="public-site-offer-badge">{item.badge}</span> : null}
                    <h3>{item.title || item.name || "Voyage"}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                    {item.price ? <strong className="public-site-offer-price">À partir de {item.price}</strong> : null}
                    <a
                      href={resolvePublicCtaHref(site, item.href, "contact")}
                      className="public-site-inline-link"
                    >
                      {label} →
                    </a>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="public-site-empty-premium">
              <strong>Les prochaines offres arrivent bientôt.</strong>
              <p>Contactez votre agence pour connaître les meilleures opportunités du moment.</p>
            </div>
          )}
        </div>

        <div className="public-site-related-links" aria-label="Autres façons de préparer votre voyage">
          <Link href={`${root}/destinations`}>Explorer les destinations proposées par votre agence</Link>
          <Link href={`${root}/services`}>Découvrir l’accompagnement et les services de l’agence</Link>
          <Link href={`${root}/contact`}>Contacter un conseiller pour préparer votre voyage</Link>
        </div>
      </div>
    </section>
  );
}

export {
  defaultOffersIntro,
  defaultOffersTitle,
  joinCities,
  offerImage,
  offerImageAlt,
  offerLinkLabel,
  siteRoot,
};
