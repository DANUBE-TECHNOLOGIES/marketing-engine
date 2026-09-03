import { getSectionContent } from "../shared/blockUtils";

export default function PageHeaderBlock({ section }) {
  const content = getSectionContent(section);
  return (
    <section className="as-page-head">
      <div className="as-shell">
        {content.eyebrow && <p className="as-eyebrow">{content.eyebrow}</p>}
        <h1>{content.title}</h1>
        {content.introduction && <p>{content.introduction}</p>}
      </div>
    </section>
  );
}
