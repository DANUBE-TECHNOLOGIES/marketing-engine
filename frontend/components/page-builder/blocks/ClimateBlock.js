import { getSectionContent, normalizeItems } from "../shared/blockUtils";

export default function ClimateBlock({ section }) {
  const content = getSectionContent(section);
  const months = normalizeItems(content.months || content.items);
  return (
    <section className="as-section as-climate">
      <div className="as-shell">
        <div className="as-section-heading">
          <div>
            {content.eyebrow && <p className="as-eyebrow">{content.eyebrow}</p>}
            <h2>{content.title || "Quand partir ?"}</h2>
          </div>
          {content.text && <p className="as-intro">{content.text}</p>}
        </div>
        {months.length > 0 && (
          <div className="as-climate-grid">
            {months.map((item, index) => (
              <article className="as-climate-card" key={`${item.title || item.month}-${index}`}>
                <h3>{item.title || item.month}</h3>
                {item.temperature && <p className="as-climate-temp">{item.temperature}</p>}
                {item.text && <p>{item.text}</p>}
                {item.label && <span className="as-pill">{item.label}</span>}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
