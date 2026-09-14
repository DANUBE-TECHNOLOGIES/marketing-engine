import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  isQuoteCtaLabel,
  quoteRequestHref,
  resolvePublicCtaHref,
} from "./ctaLinks";

function explicitCtaHref(site, href) {
  const value = String(href || "").trim();
  if (!value || /^(javascript:|data:|vbscript:)/i.test(value)) return null;
  return resolvePublicCtaHref(site, value, "", { label: "" });
}

function configuredCta(site, cta) {
  const label = String(cta?.label || "").trim();
  if (!label) return null;
  if (isQuoteCtaLabel(label)) {
    return { label, href: quoteRequestHref(site, { source: "general" }) };
  }
  const href = explicitCtaHref(site, cta?.href);
  return href ? { label, href } : null;
}

function CtaButton({ cta, className }) {
  if (!cta) return null;
  return <a className={className} href={cta.href}>{cta.label}</a>;
}

function isHomePage(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

export default function CtaV2Renderer({ section, site, page }) {
  const content = getSectionContent(section);
  if (isHomePage(page)) return null;

  const title = getSectionTitle(section, null);
  const primaryCta = configuredCta(site, content.primaryCta);
  const secondaryCta = configuredCta(site, content.secondaryCta);
  const text = content.text || null;
  const hasPrimaryCta = Boolean(primaryCta);
  const hasSecondaryCta = Boolean(secondaryCta);

  if (!title && !text && !hasPrimaryCta && !hasSecondaryCta) return null;

  return (
    <section className="public-site-section public-site-cta">
      <div className="public-site-container">
        {title ? <h2>{title}</h2> : null}
        {text ? <p>{text}</p> : null}
        {hasPrimaryCta || hasSecondaryCta ? (
          <div className="public-site-hero-actions">
            <CtaButton cta={primaryCta} className="public-site-button" />
            <CtaButton cta={secondaryCta} className="public-site-button public-site-button-secondary" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { configuredCta, explicitCtaHref, isHomePage };
