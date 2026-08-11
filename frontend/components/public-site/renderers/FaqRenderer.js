import {
  getItems,
  getSectionTitle,
} from "./helpers";

function defaultFaqTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Questions fréquentes sur votre agence à ${city}`
    : "Questions fréquentes sur votre agence";
}

export default function FaqRenderer({
  section,
  site,
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
            defaultFaqTitle(site)
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

export {
  defaultFaqTitle,
};
