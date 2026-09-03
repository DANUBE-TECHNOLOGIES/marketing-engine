import BlockAction from "../shared/BlockAction";
import { getSectionContent } from "../shared/blockUtils";

export default function IntroBlock({ section }) {
  const content = getSectionContent(section);
  const paragraphs = Array.isArray(content.paragraphs) ? content.paragraphs.filter(Boolean) : [];
  return (
    <section className="as-section as-section-intro">
      <div className="as-shell as-prose">
        {content.title && <h2>{content.title}</h2>}
        {content.text && <p className="as-intro">{content.text}</p>}
        {paragraphs.map((paragraph, index) => <p key={`${section?.id || "intro"}-${index}`}>{paragraph}</p>)}
        {content.link && <div className="as-section-link"><BlockAction action={content.link} secondary /></div>}
      </div>
    </section>
  );
}
