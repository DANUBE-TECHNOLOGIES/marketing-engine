import { preconnect, preload } from "react-dom";
import { getShowcaseUrl } from "../../../lib/showcase-url";
import {
  getSectionContent,
} from "./helpers";
import {
  resolvePublicCtaHref,
  sitePageHref,
} from "./ctaLinks";

const NETWORK_HOME_HERO_IMAGE =
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2400&q=85";

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
  const slug = pageSlug(page);

  if (!city) return String(page?.title || "").trim() || null;
  if (!slug || ["home", "accueil", "index"].includes(slug)) return `Agence de voyages à ${city}`;
  if (["agence", "notre-agence"].includes(slug)) return `Découvrez notre agence à ${city}`;
  if (slug === "services") return `Services voyage et billetterie à ${city}`;
  if (["destinations", "destination"].includes(slug)) return `Destinations et voyages depuis ${city}`;
  if (["inspiration", "inspirations"].includes(slug)) return `Inspirations voyage depuis ${city}`;
  if (["equipe", "team", "notre-equipe"].includes(slug)) return `Vos conseillers voyage à ${city}`;
  if (["partenaires", "partners", "nos-partenaires"].includes(slug)) return `Nos partenaires voyage à ${city}`;
  if (["contact", "nous-contacter"].includes(slug)) return `Nous contacter à ${city}`;
  if (["avis", "reviews", "avis-clients"].includes(slug)) return `Avis de nos voyageurs à ${city}`;
  if (["engagements", "commitments"].includes(slug)) return `Notre accompagnement voyage à ${city}`;
  return String(page?.title || "").trim() || null;
}

function resolvedHeroTitle({ content, section, site, page, forcePageIntent = false }) {
  const configured = content.title || content.heading || section.title || "";
  const localIntent = intentHeroTitle({ page, site });
  if (forcePageIntent && localIntent) return localIntent;
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

function resolvedHeroImage({ content, page, sharedNetworkHero = false }) {
  const configured = content.backgroundImage || content.imageUrl || null;
  if (configured) return configured;
  return isHomePage(page) || sharedNetworkHero ? NETWORK_HOME_HERO_IMAGE : null;
}

function imageOrigin(value) {
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function isShowcaseCta(cta, legacyLabel) {
  const label = String(cta?.label || legacyLabel || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

  return /\bdecouvrir\b/.test(label) && /\b(nos|vos)?\s*voyages?\b/.test(label);
}

export default function HeroV2Renderer({ section, site, page, forcePageIntent = false, sharedNetworkHero = false }) {
  const content = getSectionContent(section);
  const title = resolvedHeroTitle({ content, section, site, page, forcePageIntent });
  const subtitle = content.subtitle || content.text || content.description || site?.agency?.description || "Votre agence vous accompagne dans la création de vos plus beaux voyages.";
  const alignment = normalizeAlignment(content.alignment);
  const backgroundImage = resolvedHeroImage({ content, page, sharedNetworkHero });
  const backgroundPosition = content.backgroundPosition || "center";
  const imageAlt = resolvedHeroAlt({ content, site, title });
  const overlayOpacity = Math.min(Math.max(Number(content.overlayOpacity ?? 72), 20), 90) / 100;
  const homeHero = isHomePage(page);
  const immersiveNetworkHero = homeHero || sharedNetworkHero;

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
  const primaryLabel = ctaLabel(primaryCta, content.primaryButton, "Demander un devis");
  const secondaryLabel = ctaLabel(secondaryCta, content.secondaryButton, immersiveNetworkHero ? "Découvrir nos voyages" : "Nous contacter");
  const primaryShowcase = isShowcaseCta(primaryCta, content.primaryButton);
  const secondaryShowcase =
    isShowcaseCta(secondaryCta, content.secondaryButton) ||
    (!secondaryCta && !content.secondaryButton && immersiveNetworkHero);
  const primaryHref = primaryShowcase
    ? getShowcaseUrl(site)
    : resolvePublicCtaHref(site, primaryCta?.href, "contact", { label: primaryLabel });
  const secondaryHref = secondaryShowcase
    ? getShowcaseUrl(site)
    : secondaryCta
      ? resolvePublicCtaHref(site, secondaryCta.href, "destinations", { label: secondaryLabel })
      : immersiveNetworkHero
        ? sitePageHref(site, "destinations")
        : content.secondaryButton
          ? resolvePublicCtaHref(site, "contact", "contact", { label: secondaryLabel })
          : null;

  const contentStyle = { textAlign: alignment };
  const centered = alignment === "center";
  const rightAligned = alignment === "right";
  const heroClassName = [
    "public-site-hero",
    "public-site-hero--immersive",
    immersiveNetworkHero ? "public-site-hero--home" : "public-site-hero--inner",
  ].filter(Boolean).join(" ");

  const overlayStyle = immersiveNetworkHero
    ? `linear-gradient(90deg, rgba(7,29,48,${overlayOpacity}) 0%, rgba(7,29,48,${Math.max(overlayOpacity - 0.16, 0.38)}) 34%, rgba(7,29,48,0.18) 58%, rgba(7,29,48,0.04) 76%, rgba(7,29,48,0) 100%)`
    : `linear-gradient(90deg, rgba(7,29,48,${overlayOpacity}) 0%, rgba(7,29,48,${Math.max(overlayOpacity - 0.12, 0.42)}) 46%, rgba(7,29,48,0.12) 78%, rgba(7,29,48,0.04) 100%)`;

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
            style={{ background: overlayStyle }}
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
            {primaryHref ? (
              <a
                className="public-site-button"
                href={primaryHref}
                {...(primaryShowcase ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {primaryLabel}
              </a>
            ) : null}
            {secondaryHref ? (
              <a
                className="public-site-button public-site-button-secondary"
                href={secondaryHref}
                {...(secondaryShowcase ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {secondaryLabel}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export {
  NETWORK_HOME_HERO_IMAGE,
  defaultHeroEyebrow,
  defaultHeroTitle,
  genericHeroTitle,
  imageOrigin,
  intentHeroTitle,
  isHomePage,
  isShowcaseCta,
  resolvedHeroAlt,
  resolvedHeroImage,
  resolvedHeroTitle,
};
