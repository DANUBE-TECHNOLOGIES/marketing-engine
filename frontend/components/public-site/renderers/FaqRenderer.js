import {
  getItems,
  getSectionTitle,
} from "./helpers";

export default function FaqRenderer({
  section,
}) {
  const items = getItems(section, [
    "items",
    "questions",
    "faqs",
  ]);

  return (
    <section className="public-site-section public-site-faq">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Questions fréquentes"
          )}
        </h2>

        <div className="public-site-faq-list">
          {items.map((item, index) => (
            <details
              key={
                item.id ||
                item.question ||
                index
              }
            >
              <summary>
                {item.question ||
                  item.title}
              </summary>

              <p>
                {item.answer ||
                  item.text}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
