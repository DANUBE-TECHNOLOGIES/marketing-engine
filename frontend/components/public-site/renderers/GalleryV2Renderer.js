import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";

function normalizeColumns(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(4, Math.trunc(parsed)));
}

function minCardWidth(columns) {
  if (columns >= 4) return 190;
  if (columns === 3) return 240;
  if (columns === 2) return 320;
  return 520;
}

function galleryAlt(image, section, site) {
  const explicit = String(image?.alt || "").trim();
  if (explicit) return explicit;

  const caption = String(image?.caption || "").trim();
  if (caption) return caption;

  const title = String(getSectionTitle(section, "") || "").trim();
  const city = String(site?.agency?.city || site?.city || "").trim();
  if (title && city) return `${title} – ${city}`;
  return title || "";
}

export default function GalleryV2Renderer({ section, site }) {
  const content = getSectionContent(section);
  const images = Array.isArray(content.images)
    ? content.images
    : [];
  const columns = normalizeColumns(content.columns);
  const minimum = minCardWidth(columns);

  return (
    <section className="public-site-section public-site-gallery-section">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(section, "Galerie")}
        </h2>

        {content.text ? (
          <p className="public-site-section-intro">
            {content.text}
          </p>
        ) : null}

        {images.length ? (
          <div
            className="public-site-gallery-grid"
            data-columns={columns}
            style={{
              display: "grid",
              gridTemplateColumns:
                `repeat(auto-fit, minmax(min(100%, ${minimum}px), 1fr))`,
              gap: "20px",
              marginTop: "38px",
            }}
          >
            {images.map((image, index) => (
              <figure
                className="public-site-gallery-item"
                key={image.id || image.url || index}
                style={{ margin: 0 }}
              >
                {image.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image.url}
                    alt={galleryAlt(image, section, site)}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: "220px",
                      objectFit: "cover",
                      display: "block",
                      borderRadius: "var(--public-radius-md)",
                    }}
                  />
                ) : null}

                {image.caption ? (
                  <figcaption>{image.caption}</figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  galleryAlt,
};
