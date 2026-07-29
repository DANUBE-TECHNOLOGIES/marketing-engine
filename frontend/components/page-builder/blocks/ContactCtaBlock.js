import BlockAction from "../shared/BlockAction";
import { getSectionContent, normalizePhone } from "../shared/blockUtils";

export default function ContactCtaBlock({ section }) {
  const content = getSectionContent(section);
  const actions = Array.isArray(content.actions) ? [...content.actions] : [];

  if (content.phone && !actions.some((action) => String(action?.href || "").startsWith("tel:"))) {
    actions.push({ label: content.phone, href: `tel:${normalizePhone(content.phone)}` });
  }

  return (
    <section className="as-cta">
      <div className="as-shell as-cta-inner">
        <div>
          {content.eyebrow && <p className="as-eyebrow">{content.eyebrow}</p>}
          <h2>{content.title || "Parlons de votre prochain voyage"}</h2>
          {content.text && <p>{content.text}</p>}
        </div>
        {actions.length > 0 && (
          <div className="as-actions">
            {actions.map((action, index) => (
              <BlockAction action={action} secondary={index > 0} key={`${action.href}-${index}`} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
