import { preconnect, preload } from "react-dom";
import {
  getSectionContent,
} from "./helpers";
import {
  phoneHref,
  resolvePublicCtaHref,
  sitePageHref,
} from "./ctaLinks";

function ctaLabel(cta, legacyLabel, fallback) {
  return cta?.label || legacyLabel || fallback;
}

function normalizeAlignment(value) {
  return ["left", "center", "right"].includes(value) ? value : "left";
}

function siteCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function defaultHeroTitle(site) {
  const city = siteCity(site);
  return city ? `Votre agence de voyages à ${city}` : site?.name || "Votre agence de voyages";
}

function defaultHeroEyebrow(site) {
  const city = siteCity(site);
  return city ? `Agence de voyages · ${city}` : "Agence de voyages";
}

function pageSlug(page) {
  return String(page?.slug || "").trim().toLowerCase();
}

function isHomePage(page) {
  const slug = pageSlug(page);
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function genericHeroTitle(value, site) {
  const title = String(value || "").replace(/\s+/g, " ").trim();
  if (!title) return true;
  const siteName = String(site?.name || "").replace(/\s+/g, " ").trim();
  if (siteName && title.toLocaleLowerCase("fr-FR") === siteName.toLocaleLowerCase("fr-FR")) return true;
  return /^(accueil|bienvenue|notre agence|votre agence|agence de voyages?)$/i.test(title);
}

function intentHeroTitle({ page, site }) {
  const city = siteCity(site);
  if (!city) return null;
  const slug = pageSlug(page);
  if (!slug || ["home", "accueil", "index"].includes(slug)) return `Agence de voyages à ${city}`;
  if (slug === "services") return `Services de votre agence de voyages à ${city}`;
  if (["destinations", "destination"].includes(slug)) return `Destinations et voyages depuis ${city}`;
  if (["inspiration", "inspirations"].includes(slug)) return `Inspirations voyage depuis ${city}`;
  if (["equipe", "team", "notre-equipe"].includes(slug)) return `Votre équipe de conseillers voyage à ${city}`;
  if (["partenaires", "partners", "nos-partenaires"].includes(slug)) return `Nos partenaires voyage à ${city}`;
  if (["contact", "nous-contacter"].includes(slug)) return `Contacter votre agence de voyages à ${city}`;
  if (["avis", "reviews", "avis-clients"].includes(slug)) return `Avis clients de votre agence de voyages à ${city}`;
  return null;
}

function resolvedHeroTitle({ content, section, site, page }) {
  const configured = content.title || content.heading || section.title || "";
  const localIntent = intentHeroTitle({ page, site });
  if (localIntent && genericHeroTitle(configured, site)) return localIntent;
  return configured || localIntent || defaultHeroTitle(site);
}

function resolvedHeroAlt({ content, site, title }) {
  const configured = String(content.imageAlt || "").replace(/\s+/g, " ").trim();
  if (configured) return configured;
  const city = siteCity(site);
  if (city) return `${title} — Mondescale ${city}`;
  return title;
}

function imageOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

export default function HeroV2Renderer({ section, site, page }) {
  const content = getSectionContent(section);
  const title = resolvedHeroTitle({ content, section, site, page });
  const subtitle = content.subtitle || content.text || content.description || site?.agency?.description || "Votre agence vous accompagne dans la création de vos plus beaux voyages.";
  const alignment = normalizeAlignment(content.alignment);
  const backgroundImage = content.backgroundImage || content.imageUrl || null;
  const backgroundPosition = content.backgroundPosition || "center";
  const imageAlt = resolvedHeroAlt({ content, site, title });
  const overlayOpacity = Math.min(Math.max(Number(content.overlayOpacity ?? 68), 20), 90) / 100;
  const homeHero = isHomePage(page);

  if (backgroundImage) {
    const origin = imageOrigin(backgroundImage);
    if (origin) preconnect(origin);
    preload(backgroundImage, {
      as: "image",
      fetchPriority: "high",
    });
  }

  const primaryCta = content.primaryCta || null;
  const secondaryCta = content.secondaryCta || null;
  const primaryHref = primaryCta?.href
    ? resolvePublicCtaHref(site, primaryCta.href, "contact")
    : phoneHref(site?.agency?.phone) || sitePageHref(site, "contact");
  const secondaryHref = secondaryCta
    ? resolvePublicCtaHref(site, secondaryCta.href, "contact")
    : content.secondaryButton
      ? sitePageHref(site, "contact")
      : null;

  const contentStyle = { textAlign: alignment };
  const centered = alignment === "center";
  const rightAligned = alignment === "right";
  const heroClassName = [
    "public-site-hero",
    "public-site-hero--immersive",
    homeHero ? "public-site-hero--home" : "public-site-hero--inner",
  ].filter(Boolean).join(" ");

  return (
    <section className={heroClassName} data-has-hero-image={backgroundImage ? "true" : "false"} data-page-slug={pageSlug(page) || "home"}>
      {backgroundImage ? (
        <div className="public-site-hero-media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={backgroundImage}
            alt={imageAlt}
            loading="eager"
            fetchPriority="high"
            width="1920"
            height="1080"
            style={{ objectPosition: backgroundPosition }}
          />
          <span
            className="public-site-hero-overlay"
            style={{
              background: `linear-gradient(90deg, rgba(8,31,52,${Math.max(overlayOpacity - 0.52, 0.03)}) 0%, rgba(8,31,52,${Math.max(overlayOpacity - 0.6, 0.02)}) 48%, rgba(8,31,52,0) 100%)`,
            }}
          />
          <span className="public-site-hero-fade" />
        </div>
      ) : null}

      <div className="public-site-container">
        <div className="public-site-hero-copy" style={contentStyle}>
          <p className="public-site-eyebrow">{content.eyebrow || defaultHeroEyebrow(site)}</p>
          <h1 style={centered ? { marginInline: "auto" } : rightAligned ? { marginLeft: "auto" } : undefined}>{title}</h1>
          <p className="public-site-hero-text" style={centered ? { marginInline: "auto" } : rightAligned ? { marginLeft: "auto" } : undefined}>{subtitle}</p>
          <div className="public-site-hero-actions" style={{ justifyContent: centered ? "center" : rightAligned ? "flex-end" : "flex-start" }}>
            {primaryHref ? <a className="public-site-button" href={primaryHref}>{ctaLabel(primaryCta, content.primaryButton, primaryCta?.href ? "En savoir plus" : "Appeler l’agence")}</a> : null}
            {secondaryHref ? <a className="public-site-button public-site-button-secondary" href={secondaryHref}>{ctaLabel(secondaryCta, content.secondaryButton, "Nous contacter")}</a> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export {
  defaultHeroEyebrow,
  defaultHeroTitle,
  genericHeroTitle,
  imageOrigin,
  intentHeroTitle,
  isHomePage,
  resolvedHeroAlt,
  resolvedHeroTitle,
};
