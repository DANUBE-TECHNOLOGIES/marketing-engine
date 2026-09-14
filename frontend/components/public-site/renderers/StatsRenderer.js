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
  ]).filter((item) => item?.value != null && item?.label);

  if (!items.length) return null;

  return (
    <section className="public-site-section public-site-stats">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Quelques chiffres"
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
