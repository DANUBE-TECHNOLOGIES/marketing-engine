import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";
import {
  destinationHref,
  destinationSectionItems,
} from "../../../lib/seo/destination-public-collection";

const RELATED_DESTINATION_PAGE_SLUGS = new Set([
  "inspiration",
  "services",
  "contact",
]);

function localCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function destinationImage(item) {
  if (!item || typeof item !== "object") return null;
  const candidates = [
    item.image,
    item.imageUrl,
    item.heroImageUrl,
    item.backgroundImage,
    item.backgroundImageUrl,
    item.coverImage,
    item.coverImageUrl,
    item.heroImage,
    item.thumbnail,
    item.thumbnailUrl,
    item.photo,
    item.photoUrl,
    item.media?.url,
    item.media?.src,
    item.image?.url,
    item.image?.src,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function destinationImageAlt(item) {
  const explicit = String(
    item?.imageAlt ||
      item?.alt ||
      item?.media?.altText ||
      item?.media?.alt ||
      item?.image?.alt ||
      ""
  ).trim();
  if (explicit) return explicit;
  return String(item?.title || item?.name || "").trim();
}

function defaultDestinationsTitle() {
  return "Destinations publiées";
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_DESTINATION_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      href: pageHref(site.slug, page),
      title: page.title,
    }));
}

function DestinationCard({ item, site }) {
  const href = destinationHref(site, item);
  const image = destinationImage(item);
  const title = String(item?.title || item?.name || "").trim();
  if (!title) return null;

  const card = (
    <article
      className="public-site-destination-card"
      data-has-image={image ? "true" : "false"}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="public-site-destination-card-image"
          src={image}
          alt={destinationImageAlt(item)}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          width="960"
          height="640"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />
      ) : null}
      {image ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(rgba(8,31,52,.12),rgba(8,31,52,.78))",
            zIndex: 1,
          }}
        />
      ) : null}
      <div style={{ position: "relative", zIndex: 2 }}>
        {item.eyebrow ? <span>{item.eyebrow}</span> : null}
        <h3>{title}</h3>
        {item.description ? <p>{item.description}</p> : null}
      </div>
    </article>
  );

  return href ? (
    <Link
      href={href}
      aria-label={`Voir ${title}`}
      style={{ color: "inherit", textDecoration: "none" }}
    >
      {card}
    </Link>
  ) : card;
}

export default function DestinationsRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = destinationSectionItems(section).filter((item) =>
    String(item?.title || item?.name || "").trim()
  );
  const introduction = String(content.text || content.description || "").trim();
  const relatedPages = relatedPublishedPages(site);
  const title = getSectionTitle(section, defaultDestinationsTitle(site));

  if (!items.length && !introduction && !String(title || "").trim()) return null;
  if (!items.length && content.showWhenEmpty !== true && !introduction) return null;

  return (
    <section className="public-site-section public-site-destinations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Destinations</p>
        {title ? <h2>{title}</h2> : null}
        {introduction ? (
          <p className="public-site-section-intro">{introduction}</p>
        ) : null}
        {items.length ? (
          <div className="public-site-destination-grid">
            {items.map((item, index) => (
              <DestinationCard
                key={item.id || item.slug || item.title || index}
                item={item}
                site={site}
              />
            ))}
          </div>
        ) : null}
        {relatedPages.length ? (
          <nav className="public-site-related-links" aria-label="Pages publiées associées">
            {relatedPages.map((page) => (
              <Link href={page.href} key={page.href}>
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
  RELATED_DESTINATION_PAGE_SLUGS,
  defaultDestinationsTitle,
  destinationHref,
  destinationImage,
  destinationImageAlt,
  localCity,
  relatedPublishedPages,
};
