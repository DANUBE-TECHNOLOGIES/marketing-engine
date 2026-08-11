import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function normalizeColumns(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(4, Math.trunc(parsed)));
}

function minimumCardWidth(columns) {
  if (columns >= 4) return 200;
  if (columns === 3) return 250;
  if (columns === 2) return 340;
  return 520;
}

function defaultFeaturesTitle(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city ? `Nos services voyage à ${city}` : "Nos services voyage";
}

function defaultFeaturesIntroduction(site) {
  const city = String(site?.agency?.city || site?.city || "").trim();
  return city
    ? `Notre équipe à ${city} vous conseille selon votre projet, votre budget et votre façon de voyager.`
    : "Notre équipe vous conseille selon votre projet, votre budget et votre façon de voyager.";
}

export default function FeaturesV2Renderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const items = Array.isArray(content.items)
    ? content.items
    : [];
  const introduction =
    content.introduction ||
    content.text ||
    content.description ||
    defaultFeaturesIntroduction(site);
  const columns = normalizeColumns(content.columns);
  const minimum = minimumCardWidth(columns);

  return (
    <section className="public-site-section public-site-features">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            defaultFeaturesTitle(site)
          )}
        </h2>

        {introduction ? (
          <p className="public-site-section-intro">
            {introduction}
          </p>
        ) : null}

        {items.length ? (
          <div
            className="public-site-card-grid"
            data-columns={columns}
            style={{
              gridTemplateColumns:
                `repeat(auto-fit, minmax(min(100%, ${minimum}px), 1fr))`,
            }}
          >
            {items.map((item, index) => (
              <article
                className="public-site-card public-site-feature-card"
                key={item.id || item.title || index}
              >
                {item.icon ? (
                  <span className="public-site-feature-icon" aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}

                <h3>{item.title || item.label}</h3>

                {item.text ? <p>{item.text}</p> : null}
                {item.description ? (
                  <p>{item.description}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  defaultFeaturesIntroduction,
  defaultFeaturesTitle,
};
