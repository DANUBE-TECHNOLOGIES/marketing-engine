import Link from "next/link";

import {
  getItems,
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function destinationHref(site, item) {
  if (!site?.slug || !item?.slug) {
    return null;
  }

  return (
    `/agence/${encodeURIComponent(site.slug)}` +
    `/destination/${encodeURIComponent(item.slug)}`
  );
}

function DestinationCard({
  item,
  site,
  index,
}) {
  const href =
    destinationHref(
      site,
      item
    );

  const card = (
    <article
      className="public-site-destination-card"
      style={
        item.image
          ? {
              backgroundImage: `
                linear-gradient(
                  rgba(8, 31, 52, 0.12),
                  rgba(8, 31, 52, 0.78)
                ),
                url("${item.image}")
              `,
            }
          : undefined
      }
    >
      <div>
        {item.eyebrow ? (
          <span>{item.eyebrow}</span>
        ) : null}

        <h3>
          {item.title ||
            item.name ||
            "Destination"}
        </h3>

        {item.description ? (
          <p>{item.description}</p>
        ) : null}
      </div>
    </article>
  );

  if (!href) {
    return (
      <div
        key={
          item.id ||
          item.title ||
          index
        }
      >
        {card}
      </div>
    );
  }

  return (
    <Link
      key={
        item.id ||
        item.slug ||
        item.title ||
        index
      }
      href={href}
      className="public-site-destination-link"
      aria-label={`Découvrir ${
        item.title ||
        item.name ||
        "cette destination"
      }`}
    >
      {card}
    </Link>
  );
}

export default function DestinationsRenderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const items = getItems(section, [
    "items",
    "destinations",
  ]);

  return (
    <section className="public-site-section public-site-destinations">
      <div className="public-site-container">
        <p className="public-site-section-kicker">
          Inspirations
        </p>

        <h2>
          {getSectionTitle(
            section,
            "Nos destinations du moment"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-destination-grid">
          {items.length ? (
            items.map((item, index) => (
              <DestinationCard
                key={
                  item.id ||
                  item.slug ||
                  item.title ||
                  index
                }
                item={item}
                site={site}
                index={index}
              />
            ))
          ) : (
            <>
              <article className="public-site-destination-card">
                <div>
                  <span>Océan Indien</span>
                  <h3>Île Maurice</h3>
                </div>
              </article>

              <article className="public-site-destination-card">
                <div>
                  <span>Évasion</span>
                  <h3>Maldives</h3>
                </div>
              </article>

              <article className="public-site-destination-card">
                <div>
                  <span>Découverte</span>
                  <h3>Japon</h3>
                </div>
              </article>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
