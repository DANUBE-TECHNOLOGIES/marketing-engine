import BlockAction from "../page-builder/shared/BlockAction";
import { getSectionContent, getSectionType, normalizeItems } from "../page-builder/shared/blockUtils";

export default function SectionRenderer({ section }) {
  const content = getSectionContent(section);
  const type = getSectionType(section);

  if (type === "contact-details" || type === "agency-details") {
    return (
      <section className="as-section">
        <div className="as-shell">
          <h2>{content.title || "Informations pratiques"}</h2>
          <div className="as-contact">
            <p>{[content.address, content.postalCode, content.city].filter(Boolean).join(" ")}</p>
            {content.phone && <p><a href={`tel:${String(content.phone).replace(/\s+/g, "")}`}>{content.phone}</a></p>}
            {content.email && <p><a href={`mailto:${content.email}`}>{content.email}</a></p>}
          </div>
        </div>
      </section>
    );
  }

  if (type === "map-placeholder") {
    return <section className="as-section"><div className="as-shell"><h2>{content.title}</h2><div className="as-map"><span>{content.address || "Adresse à renseigner"}</span></div></div></section>;
  }

  if (type === "legal-notice" || type === "privacy-notice") {
    return (
      <section className="as-section">
        <div className="as-shell as-prose">
          <h2>{content.title}</h2>
          <p>{content.text}</p>
          {content.status?.startsWith("requires-") && <p className="as-warning">Contenu à valider avant publication.</p>}
        </div>
      </section>
    );
  }

  const items = normalizeItems(content.items);
  return (
    <section className="as-section" data-block-type={type}>
      <div className="as-shell">
        {content.title && <h2>{content.title}</h2>}
        {content.text && <p className="as-intro">{content.text}</p>}
        {Array.isArray(content.paragraphs) && content.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {items.length > 0 && (
          <div className="as-grid">
            {items.map((item, index) => <article className="as-card" key={`${item.title}-${index}`}><h3>{item.title}</h3>{item.text && <p>{item.text}</p>}</article>)}
          </div>
        )}
        {content.link && <div className="as-section-link"><BlockAction action={content.link} secondary /></div>}
        {content.url && <p><a href={content.url} target="_blank" rel="noreferrer">Consulter les avis Google</a></p>}
      </div>
    </section>
  );
}
