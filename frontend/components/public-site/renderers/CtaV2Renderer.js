import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

function CtaButton({
  cta,
  site,
  className,
}) {
  if (!cta?.label) return null;

  return (
    <a
      className={className}
      href={resolvePublicCtaHref(
        site,
        cta.href,
        "contact"
      )}
    >
      {cta.label}
    </a>
  );
}

export default function CtaV2Renderer({
  section,
  site,
}) {
  const content =
    getSectionContent(section);

  const primaryCta =
    content.primaryCta ||
    (content.primaryButton
      ? {
          label:
            content.primaryButton,
          href:
            "/contact",
        }
      : {
          label:
            "Demander un devis",
          href:
            "/contact",
        });

  const secondaryCta =
    content.secondaryCta ||
    null;

  return (
    <section className="public-site-section public-site-cta">
      <div className="public-site-container">
        <h2>
          {getSectionTitle(
            section,
            "Préparons votre prochain voyage"
          )}
        </h2>

        {content.text ? (
          <p>{content.text}</p>
        ) : null}

        <div className="public-site-hero-actions">
          <CtaButton
            cta={primaryCta}
            site={site}
            className="public-site-button"
          />

          <CtaButton
            cta={secondaryCta}
            site={site}
            className="public-site-button public-site-button-secondary"
          />
        </div>
      </div>
    </section>
  );
}
