import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

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

export default function InspirationsRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "articles",
    "inspirations",
  ]);

  if (!items.length && content.showWhenEmpty !== true) {
    return null;
  }

  return (
    <section className="public-site-section public-site-inspirations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Conseils voyageurs
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Laissez-vous inspirer"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        {items.length ? (
          <div className="public-site-editorial-grid">
            {items.map((item, index) => {
              const href = inspirationHref(site, item);
              const title = inspirationTitle(item);
              const image = inspirationImage(item);
              const card = (
                <article
                  className="public-site-editorial-card"
                  key={item.id || item.slug || index}
                >
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
                  aria-label={`Lire l'inspiration ${title}`}
                >
                  {card}
                </Link>
              ) : card;
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  inspirationHref,
  inspirationImage,
  inspirationImageAlt,
  inspirationTitle,
};
