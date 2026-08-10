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
              const card = (
                <article
                  className="public-site-editorial-card"
                  key={item.id || item.slug || index}
                >
                  {item.image ? (
                    <div
                      className="public-site-editorial-image"
                      style={{ backgroundImage: `url("${item.image}")` }}
                    />
                  ) : null}

                  <div>
                    {item.category ? <span>{item.category}</span> : null}
                    <h3>{item.title || "Inspiration voyage"}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                    {href ? <strong>Découvrir cette inspiration →</strong> : null}
                  </div>
                </article>
              );

              return href ? (
                <Link
                  href={href}
                  key={item.id || item.slug || index}
                  className="public-site-editorial-link"
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
};
