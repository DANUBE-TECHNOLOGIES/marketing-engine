import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";

const RELATED_OFFER_PAGE_SLUGS = new Set(["destinations", "services", "contact"]);

function defaultOffersTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Offres de voyages publiées à ${city}`
    : "Offres de voyages publiées";
}

function defaultOffersIntro(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Retrouvez les offres actuellement publiées par votre agence de voyages à ${city}.`
    : "Retrouvez les offres actuellement publiées par votre agence de voyages.";
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
  const explicit = String(item?.linkLabel || item?.ctaLabel || item?.buttonLabel || "").trim();
  if (explicit) return explicit;
  const title = String(item?.title || item?.name || "").trim();
  return title ? `Voir ${title}` : "Voir l’offre";
}

function publishedOfferRelatedPages(site) {
  return uniquePublishedNavigation(site).filter((page) => RELATED_OFFER_PAGE_SLUGS.has(pageSlug(page)));
}

export default function OffersRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = getItems(section, ["items", "offers"]);
  const introduction = content.text || content.introduction || content.description || defaultOffersIntro(site);
  const relatedPages = publishedOfferRelatedPages(site);

  return (
    <section className="public-site-section public-site-offers">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Offres publiées</p>
        <h2>{getSectionTitle(section, defaultOffersTitle(site))}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}

        <div className="public-site-offer-grid">
          {items.length ? (
            items.map((item, index) => {
              const image = offerImage(item);
              const resolvedHref = resolvePublicCtaHref(site, item?.href, "");
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
                    <h3>{item.title || item.name || "Offre publiée"}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                    {item.price ? <strong className="public-site-offer-price">Prix publié : {item.price}</strong> : null}
                    {resolvedHref ? (
                      <a
                        href={resolvedHref}
                        className="public-site-inline-link"
                      >
                        {offerLinkLabel(item)} →
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="public-site-empty-premium">
              <strong>Aucune offre n’est actuellement publiée dans cette section.</strong>
            </div>
          )}
        </div>

        {relatedPages.length ? (
          <div className="public-site-related-links" aria-label="Pages publiées associées aux offres">
            {relatedPages.map((page) => (
              <Link key={pageSlug(page)} href={pageHref(site.slug, page)}>{page.title}</Link>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  RELATED_OFFER_PAGE_SLUGS,
  defaultOffersIntro,
  defaultOffersTitle,
  offerImage,
  offerImageAlt,
  offerLinkLabel,
  publishedOfferRelatedPages,
};
