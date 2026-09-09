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

function explicitCtaHref(site, cta) {
  const href = String(cta?.href || "").trim();
  if (!href || /^(javascript:|data:|vbscript:)/i.test(href)) return null;
  return resolvePublicCtaHref(site, href, "");
}

export default function ImageTextV2Renderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const imageUrl = String(
    content.imageUrl ||
    content.image ||
    ""
  ).trim();
  const imagePosition =
    content.imagePosition === "right"
      ? "right"
      : "left";
  const cta =
    content.cta ||
    content.primaryCta ||
    null;
  const ctaLabel = String(cta?.label || "").trim();
  const ctaHref = explicitCtaHref(site, cta);
  const title = getSectionTitle(section, null);
  const hasCopy = Boolean(
    content.eyebrow ||
    title ||
    content.text ||
    content.description ||
    (ctaLabel && ctaHref)
  );

  if (!imageUrl && !hasCopy) return null;

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
            imageUrl && hasCopy
              ? "repeat(auto-fit, minmax(280px, 1fr))"
              : "1fr",
          gap: "42px",
          alignItems: "center",
        }}
      >
        {imageUrl ? (
          <div
            className="public-site-image-text-media"
            style={{ order: mediaOrder }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageAltText(section, content, site)}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              width="1200"
              height="800"
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                borderRadius: "var(--public-radius-md)",
              }}
            />
          </div>
        ) : null}

        {hasCopy ? (
          <div
            className="public-site-image-text-copy"
            style={{ order: copyOrder }}
          >
            {content.eyebrow ? (
              <p className="public-site-section-kicker">
                {content.eyebrow}
              </p>
            ) : null}

            {title ? <h2>{title}</h2> : null}

            {content.text ? <p>{content.text}</p> : null}
            {content.description ? (
              <p>{content.description}</p>
            ) : null}

            {ctaLabel && ctaHref ? (
              <a
                className="public-site-inline-link"
                href={ctaHref}
              >
                {ctaLabel} →
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export {
  explicitCtaHref,
  imageAltText,
};
