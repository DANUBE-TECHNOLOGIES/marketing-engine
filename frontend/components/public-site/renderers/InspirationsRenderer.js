import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";

const RELATED_INSPIRATION_PAGE_SLUGS = new Set(["destinations", "services", "contact"]);

function inspirationHref(site, item) {
  if (!site?.slug || !item?.slug) return null;
  return `/agence/${encodeURIComponent(site.slug)}/inspiration/${encodeURIComponent(item.slug)}`;
}

function inspirationTitle(item) {
  return String(item?.title || item?.name || "Contenu publié").trim();
}

function inspirationImage(item) {
  return item?.imageUrl || item?.image || item?.media?.url || null;
}

function inspirationImageAlt(item) {
  const configured = String(
    item?.imageAlt || item?.altText || item?.media?.altText || ""
  ).trim();
  if (configured) return configured;
  const title = inspirationTitle(item);
  return title ? `Illustration : ${title}` : "";
}

function factualIntroduction(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Retrouvez les contenus d’inspiration publiés par votre agence de voyages à ${city}.`
    : "Retrouvez les contenus d’inspiration publiés par votre agence de voyages.";
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_INSPIRATION_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

export default function InspirationsRenderer({ section, site }) {
  const content = getSectionContent(section);
  const items = getItems(section, ["items", "articles", "inspirations"]);
  const city = String(site?.agency?.city || site?.city || "").trim();
  const relatedPages = relatedPublishedPages(site);

  if (!items.length && content.showWhenEmpty !== true) {
    return null;
  }

  return (
    <section className="public-site-section public-site-inspirations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Inspirations publiées</p>

        <h2>
          {getSectionTitle(
            section,
            city ? `Inspirations voyage à ${city}` : "Inspirations voyage"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : (
          <p className="public-site-section-intro">{factualIntroduction(site)}</p>
        )}

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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image}
                        alt={inspirationImageAlt(item)}
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                        width="720"
                        height="480"
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
                  aria-label={`Lire ${title}`}
                >
                  {card}
                </Link>
              ) : card;
            })}
          </div>
        ) : null}

        {relatedPages.length ? (
          <nav
            className="public-site-related-links"
            aria-label="Pages publiées associées"
          >
            {relatedPages.map((page) => (
              <Link href={page.href} key={page.slug}>{page.title}</Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  RELATED_INSPIRATION_PAGE_SLUGS,
  factualIntroduction,
  inspirationHref,
  inspirationImage,
  inspirationImageAlt,
  inspirationTitle,
  relatedPublishedPages,
};
