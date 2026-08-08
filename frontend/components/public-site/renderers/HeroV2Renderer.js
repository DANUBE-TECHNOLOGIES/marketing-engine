import {
  getSectionContent,
} from "./helpers";
import {
  phoneHref,
  resolvePublicCtaHref,
  sitePageHref,
} from "./ctaLinks";

function ctaLabel(cta, legacyLabel, fallback) {
  return (
    cta?.label ||
    legacyLabel ||
    fallback
  );
}

export default function HeroV2Renderer({
  section,
  site,
}) {
  const content = getSectionContent(section);
  const title =
    content.title ||
    content.heading ||
    section.title ||
    site?.name ||
    "Votre agence de voyages";
  const subtitle =
    content.subtitle ||
    content.text ||
    content.description ||
    site?.agency?.description ||
    "Votre agence vous accompagne dans la création de vos plus beaux voyages.";

  const backgroundImage =
    content.backgroundImage ||
    content.imageUrl ||
    null;
  const backgroundPosition =
    content.backgroundPosition ||
    "center";
  const overlayOpacity =
    Math.min(
      Math.max(
        Number(content.overlayOpacity ?? 68),
        20
      ),
      90
    ) / 100;

  const heroStyle = backgroundImage
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(8,31,52,${overlayOpacity}) 0%, rgba(8,31,52,${Math.max(
          overlayOpacity - 0.12,
          0.2
        )}) 48%, rgba(8,31,52,${Math.max(
          overlayOpacity - 0.35,
          0.08
        )}) 100%), url("${backgroundImage}")`,
        backgroundPosition,
      }
    : undefined;

  const primaryCta = content.primaryCta || null;
  const secondaryCta = content.secondaryCta || null;

  const primaryHref = primaryCta?.href
    ? resolvePublicCtaHref(
        site,
        primaryCta.href,
        "contact"
      )
    : phoneHref(site?.agency?.phone) ||
      sitePageHref(site, "contact");

  const secondaryHref = secondaryCta
    ? resolvePublicCtaHref(
        site,
        secondaryCta.href,
        "contact"
      )
    : content.secondaryButton
      ? sitePageHref(site, "contact")
      : null;

  return (
    <section
      className="public-site-hero"
      style={heroStyle}
      aria-label={
        content.imageAlt || undefined
      }
    >
      <div className="public-site-container">
        <p className="public-site-eyebrow">
          {content.eyebrow ||
            "Agence de voyages"}
        </p>

        <h1>{title}</h1>

        <p className="public-site-hero-text">
          {subtitle}
        </p>

        <div className="public-site-hero-actions">
          {primaryHref ? (
            <a
              className="public-site-button"
              href={primaryHref}
            >
              {ctaLabel(
                primaryCta,
                content.primaryButton,
                primaryCta?.href
                  ? "En savoir plus"
                  : "Appeler l’agence"
              )}
            </a>
          ) : null}

          {secondaryHref ? (
            <a
              className="public-site-button public-site-button-secondary"
              href={secondaryHref}
            >
              {ctaLabel(
                secondaryCta,
                content.secondaryButton,
                "Nous contacter"
              )}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
