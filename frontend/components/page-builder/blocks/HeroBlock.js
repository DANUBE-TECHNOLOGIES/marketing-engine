import BlockAction from "../shared/BlockAction";
import { getSectionContent } from "../shared/blockUtils";

export default function HeroBlock({ section }) {
  const content = getSectionContent(section);
  const style = content.imageUrl
    ? { backgroundImage: `linear-gradient(120deg,rgba(19,36,58,.90),rgba(33,87,119,.72)),url(${content.imageUrl})` }
    : undefined;

  return (
    <section className="as-hero" style={style} aria-labelledby={section?.id ? `${section.id}-title` : undefined}>
      <div className="as-shell as-hero-grid">
        <div className="as-hero-copy">
          {content.eyebrow && <p className="as-eyebrow">{content.eyebrow}</p>}
          <h1 id={section?.id ? `${section.id}-title` : undefined}>{content.title}</h1>
          {content.text && <p className="as-lead">{content.text}</p>}
          {(content.primaryCta || content.secondaryCta) && (
            <div className="as-actions">
              <BlockAction action={content.primaryCta} />
              <BlockAction action={content.secondaryCta} secondary />
            </div>
          )}
        </div>
        {(content.reviewScore || content.reviewCount || content.badge) && (
          <aside className="as-hero-proof" aria-label="Éléments de réassurance">
            {content.badge && <strong>{content.badge}</strong>}
            {content.reviewScore && <span className="as-review-score">{content.reviewScore}/5</span>}
            {content.reviewCount && <span>{content.reviewCount} avis clients</span>}
          </aside>
        )}
      </div>
    </section>
  );
}
