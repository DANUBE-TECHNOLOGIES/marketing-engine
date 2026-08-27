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
    <a className={className} href={resolvePublicCtaHref(site, cta.href, "contact")}>
      {cta.label}
    </a>
  );
}

function isHomePage(page) {
  const slug = String(page?.slug || "").trim().toLowerCase();
  return !slug || ["home", "accueil", "index"].includes(slug);
}

export default function CtaV2Renderer({ section, site, page }) {
  const content = getSectionContent(section);

  /*
   * The home already exposes a primary CTA in the hero and conversion actions
   * in the contact block. Historical CTA PageBlocks duplicated that journey
   * and made the page unnecessarily long, so they remain available on inner
   * pages but are intentionally suppressed on the home.
   */
  if (isHomePage(page)) return null;

  const primaryCta = content.primaryCta || (content.primaryButton
    ? { label: content.primaryButton, href: "contact" }
    : { label: "Demander un devis", href: "contact" });
  const secondaryCta = content.secondaryCta || null;

  return (
    <section className="public-site-section public-site-cta">
      <div className="public-site-container">
        <h2>{getSectionTitle(section, "Préparons votre prochain voyage")}</h2>
        {content.text ? <p>{content.text}</p> : null}
        <div className="public-site-hero-actions">
          <CtaButton cta={primaryCta} site={site} className="public-site-button" />
          <CtaButton cta={secondaryCta} site={site} className="public-site-button public-site-button-secondary" />
        </div>
      </div>
    </section>
  );
}

export { isHomePage };
