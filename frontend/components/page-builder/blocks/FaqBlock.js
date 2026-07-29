import { getSectionContent } from "../shared/blockUtils";

export default function FaqBlock({ section }) {
  const content = getSectionContent(section);
  const items = Array.isArray(content.items)
    ? content.items.filter((item) => item?.question && item?.answer)
    : [];

  if (items.length === 0) return null;

  return (
    <section className="as-section as-section-faq">
      <div className="as-shell">
        <h2>{content.title || "Questions fréquentes"}</h2>
        {content.text && <p className="as-intro">{content.text}</p>}
        <div className="as-faq">
          {items.map((item, index) => (
            <details key={`${item.question}-${index}`}>
              <summary>{item.question}</summary>
              <div className="as-faq-answer"><p>{item.answer}</p></div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
