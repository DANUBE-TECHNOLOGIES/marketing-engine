import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

function imageAltText(section, content, site) {
  const explicit = String(content.imageAlt || "").trim();
  if (explicit) return explicit;

  const title = String(getSectionTitle(section, "") || "").trim();
  const city = String(site?.agency?.city || site?.city || "").trim();

  if (title && city) return `${title} – ${city}`;
  if (title) return title;
  return "";
}

export default function ImageTextV2Renderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const imagePosition =
    content.imagePosition === "right"
      ? "right"
      : "left";
  const cta =
    content.cta ||
    content.primaryCta ||
    null;

  const mediaOrder = imagePosition === "right" ? 2 : 1;
  const copyOrder = imagePosition === "right" ? 1 : 2;

  return (
    <section className="public-site-section public-site-image-text">
      <div
        className="public-site-container"
        data-image-position={imagePosition}
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "42px",
          alignItems: "center",
        }}
      >
        <div
          className="public-site-image-text-media"
          style={{ order: mediaOrder }}
        >
          {content.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={content.imageUrl}
              alt={imageAltText(section, content, site)}
              loading="lazy"
              decoding="async"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "var(--public-radius-md)",
              }}
            />
          ) : (
            <div className="public-site-image-placeholder" aria-hidden="true" />
          )}
        </div>

        <div
          className="public-site-image-text-copy"
          style={{ order: copyOrder }}
        >
          {content.eyebrow ? (
            <p className="public-site-section-kicker">
              {content.eyebrow}
            </p>
          ) : null}

          {getSectionTitle(section, null) ? (
            <h2>{getSectionTitle(section, null)}</h2>
          ) : null}

          {content.text ? <p>{content.text}</p> : null}
          {content.description ? (
            <p>{content.description}</p>
          ) : null}

          {cta?.label ? (
            <a
              className="public-site-inline-link"
              href={resolvePublicCtaHref(
                site,
                cta.href,
                "contact"
              )}
            >
              {cta.label} →
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export {
  imageAltText,
};
