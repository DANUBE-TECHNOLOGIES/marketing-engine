import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  resolvePublicCtaHref,
} from "./ctaLinks";

function CtaButton({ cta, site, className }) {
  if (!cta?.label) return null;
  return (
    <a
      className={className}
      href={resolvePublicCtaHref(site, cta.href, "contact", { label: cta.label })}
    >
      {cta.label}
    </a>
  );
}

function isHomePage(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function legacyCta(label) {
  return label ? { label, href: "contact" } : null;
}

export default function CtaV2Renderer({ section, site, page }) {
  const content = getSectionContent(section);

  /*
   * The home already exposes its configured conversion actions elsewhere.
   * Historical CTA PageBlocks remain available on inner pages only.
   */
  if (isHomePage(page)) return null;

  const title = getSectionTitle(section, null);
  const primaryCta = content.primaryCta || legacyCta(content.primaryButton);
  const secondaryCta = content.secondaryCta || legacyCta(content.secondaryButton);
  const text = content.text || null;
  const hasPrimaryCta = Boolean(primaryCta?.label);
  const hasSecondaryCta = Boolean(secondaryCta?.label);

  if (!title && !text && !hasPrimaryCta && !hasSecondaryCta) return null;

  return (
    <section className="public-site-section public-site-cta">
      <div className="public-site-container">
        {title ? <h2>{title}</h2> : null}
        {text ? <p>{text}</p> : null}
        {hasPrimaryCta || hasSecondaryCta ? (
          <div className="public-site-hero-actions">
            <CtaButton cta={primaryCta} site={site} className="public-site-button" />
            <CtaButton cta={secondaryCta} site={site} className="public-site-button public-site-button-secondary" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { isHomePage, legacyCta };
