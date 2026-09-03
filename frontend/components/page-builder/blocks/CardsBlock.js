import BlockAction from "../shared/BlockAction";
import { getSectionContent, normalizeItems } from "../shared/blockUtils";

export default function CardsBlock({ section }) {
  const content = getSectionContent(section);
  const items = normalizeItems(content.items);
  return (
    <section className="as-section">
      <div className="as-shell">
        {content.title && <h2>{content.title}</h2>}
        {content.text && <p className="as-intro">{content.text}</p>}
        {items.length > 0 && (
          <div className="as-grid">
            {items.map((item, index) => (
              <article className="as-card" key={`${item.title}-${index}`}>
                <h3>{item.title}</h3>
                {item.text && <p>{item.text}</p>}
                {(item.href || item.path) && (
                  <div className="as-card-action">
                    <BlockAction action={{ href: item.href || item.path, label: item.label || "Découvrir" }} secondary />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {content.link && <div className="as-section-link"><BlockAction action={content.link} secondary /></div>}
      </div>
    </section>
  );
}
