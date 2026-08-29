import { Suspense } from "react";
import Link from "next/link";

import { getShowcaseUrl } from "../../lib/showcase-url";
import PublicBrandLogo from "./PublicBrandLogo";
import PublicOpeningStatus from "./PublicOpeningStatus";

const NAVIGATION_ALIASES = Object.freeze({
  home: "",
  accueil: "",
  index: "",
  inspirations: "inspiration",
});

const TUI_SHOWCASE_DISABLED_CITIES = new Set(["amilly", "melun"]);

function normalizeNavigation(site) {
  if (Array.isArray(site.navigation)) return site.navigation;
  if (Array.isArray(site.navigation?.main)) return site.navigation.main;
  return [];
}

function extractSlug(path = "") {
  const parts = String(path).split("/").filter(Boolean);
  return parts.at(-1) || "";
}

function normalizePageSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function canonicalNavigationSlug(value) {
  const slug = normalizePageSlug(value);
  return Object.prototype.hasOwnProperty.call(NAVIGATION_ALIASES, slug)
    ? NAVIGATION_ALIASES[slug]
    : slug;
}

function pageSlug(page) {
  return canonicalNavigationSlug(
    page?.slug !== undefined ? page.slug : extractSlug(page?.path)
  );
}

function pageHref(siteSlug, page) {
  const slug = pageSlug(page);
  if (!slug || page?.title === "Accueil") return `/agence/${siteSlug}`;
  return `/agence/${siteSlug}/${slug}`;
}

function uniquePublishedNavigation(site) {
  const seen = new Set();
  return normalizeNavigation(site).filter((page) => {
    if (!page?.title) return false;
    if (["Mentions légales", "Confidentialité"].includes(page.title)) return false;
    const slug = pageSlug(page);
    const key = slug || "__home__";
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function telephoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

function isTuiShowcaseDisabled(site) {
  const name = String(site?.name || site?.brand?.name || "").trim().toLowerCase();
  const city = String(site?.agency?.city || "").trim().toLowerCase();
  return name.includes("tui") && TUI_SHOWCASE_DISABLED_CITIES.has(city);
}

export default function PublicSiteHeader({ site, brand, brandRuntime, brandAssets }) {
  const resolvedPublicBrand =
    brand || brandRuntime?.runtime?.brand || site?.brand || site?.branding || site?.brandProfile || null;
  const resolvedPublicBrandAssets = brandAssets || resolvedPublicBrand?.assets || {};
  const pages = uniquePublishedNavigation(site);
  const agency = site.agency || {};
  const city = String(agency.city || "").trim();
  const showcaseDisabled = isTuiShowcaseDisabled(site);
  const showcaseUrl = showcaseDisabled ? null : getShowcaseUrl(site);

  return (
    <>
      <div className="public-site-trustbar">
        <div className="public-site-container public-site-trustbar-inner">
          <span>{city ? `Votre agence de voyages de proximité à ${city}` : "Votre agence de voyages de proximité"}</span>
          <div className="public-site-trustbar-items">
            <Suspense fallback={null}>
              <PublicOpeningStatus siteSlug={site.slug} />
            </Suspense>
            <span>Conseils personnalisés</span>
            <span>Accompagnement avant, pendant et après</span>
          </div>
        </div>
      </div>

      <header className="public-site-header">
        <div className="public-site-container public-site-header-main">
          <Link
            href={`/agence/${site.slug}`}
            className="public-site-header-identity"
            aria-label={city ? `Accueil de l’agence de voyages ${site.name} à ${city}` : `Accueil ${site.name}`}
          >
            <span className="public-site-header-logo-wrap">
              <PublicBrandLogo
                brand={resolvedPublicBrand}
                brandAssets={resolvedPublicBrandAssets}
                site={site}
                agency={agency}
                className="public-site-header__brand-logo"
              />
            </span>
            <span className="public-site-brand-copy">
              <strong>{site.name}</strong>
              {city ? <small>Agence de voyages à {city}</small> : null}
            </span>
          </Link>

          <div className="public-site-header-actions">
            {agency.phone ? (
              <a
                className="public-site-header-phone"
                href={telephoneHref(agency.phone)}
                aria-label={city ? `Appeler l’agence de voyages de ${city} au ${agency.phone}` : `Appeler l’agence au ${agency.phone}`}
              >
                <span className="public-site-header-phone-label">Appelez-nous</span>
                <strong>{agency.phone}</strong>
              </a>
            ) : null}

            <Link
              className="public-site-header-cta"
              href={`/agence/${site.slug}/contact`}
              aria-label={city ? `Demander un devis voyage à l’agence de ${city}` : "Demander un devis voyage"}
            >
              Demander un devis
            </Link>

            {showcaseUrl ? (
              <a
                className="public-site-header-cta public-site-header-showcase"
                href={showcaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={city ? `Découvrir les voyages proposés par l’agence de ${city}` : "Découvrir nos voyages"}
              >
                Découvrir nos voyages
                <span aria-hidden="true">↗</span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="public-site-header-navrow">
          <div className="public-site-container">
            <nav className="public-site-navigation" aria-label={city ? `Navigation de l’agence de voyages de ${city}` : "Navigation principale"}>
              {pages.map((page, index) => (
                <Link
                  key={page.id || page.path || `${page.title}-${index}`}
                  href={pageHref(site.slug, page)}
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export {
  NAVIGATION_ALIASES,
  TUI_SHOWCASE_DISABLED_CITIES,
  canonicalNavigationSlug,
  extractSlug,
  isTuiShowcaseDisabled,
  normalizeNavigation,
  normalizePageSlug,
  pageHref,
  pageSlug,
  telephoneHref,
  uniquePublishedNavigation,
};
