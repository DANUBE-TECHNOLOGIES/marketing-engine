import Link from "next/link";
import { getSectionContent, normalizeItems } from "../shared/blockUtils";

export default function RelatedDestinationsBlock({ section }) {
  const content = getSectionContent(section);
  const items = normalizeItems(content.items);
  if (items.length === 0) return null;

  return (
    <section className="as-section as-related-destinations">
      <div className="as-shell">
        <div className="as-section-heading">
          <div>
            {content.eyebrow && <p className="as-eyebrow">{content.eyebrow}</p>}
            <h2>{content.title || "Destinations à découvrir"}</h2>
          </div>
          {content.text && <p className="as-intro">{content.text}</p>}
        </div>
        <div className="as-grid as-destination-grid">
          {items.map((item, index) => {
            const href = item.href || item.path;
            const body = (
              <>
                {item.imageUrl && <span className="as-card-image" style={{ backgroundImage: `url(${item.imageUrl})` }} aria-hidden="true" />}
                <span className="as-card-body">
                  <h3>{item.title || item.name}</h3>
                  {item.text && <p>{item.text}</p>}
                  {(item.region || item.country) && <span className="as-card-meta">{[item.region, item.country].filter(Boolean).join(" · ")}</span>}
                </span>
              </>
            );
            return href
              ? <Link className="as-card as-destination-card" href={href} key={`${item.title || item.name}-${index}`}>{body}</Link>
              : <article className="as-card as-destination-card" key={`${item.title || item.name}-${index}`}>{body}</article>;
          })}
        </div>
      </div>
    </section>
  );
}
