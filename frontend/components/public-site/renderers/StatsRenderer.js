import {
  getItems,
  getSectionTitle,
} from "./helpers";

export default function StatsRenderer({
  section,
}) {
  const items = getItems(section, [
    "items",
    "stats",
  ]);

  return (
    <section className="public-site-section public-site-stats">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Notre expertise en quelques chiffres"
          )}
        </h2>

        <div className="public-site-stats-grid">
          {items.map((item, index) => (
            <article
              key={
                item.id ||
                item.label ||
                index
              }
            >
              <strong>
                {item.value}
              </strong>

              <span>
                {item.label}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
