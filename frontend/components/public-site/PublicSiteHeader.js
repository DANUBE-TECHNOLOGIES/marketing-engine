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

const MANAGED_PUBLIC_ROUTES = Object.freeze([
  Object.freeze({ id: "managed-voyages-affaires", slug: "voyages-affaires", title: "Voyages d’affaires" }),
  Object.freeze({ id: "managed-groupes", slug: "groupes", title: "Groupes" }),
]);

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

function uniquePublicNavigation(site) {
  const published = uniquePublishedNavigation(site);
  const seen = new Set(published.map((page) => pageSlug(page) || "__home__"));
  const managed = MANAGED_PUBLIC_ROUTES.filter((page) => {
    const slug = pageSlug(page);
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });

  return [...published, ...managed];
}

function publishedPageBySlug(pages, slug) {
  const target = canonicalNavigationSlug(slug);
  return (pages || []).find((page) => pageSlug(page) === target) || null;
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
  const publishedPages = uniquePublishedNavigation(site);
  const pages = uniquePublicNavigation(site);
  const contactPage = publishedPageBySlug(publishedPages, "contact");
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

            {contactPage ? (
              <Link
                className="public-site-header-cta"
                href={pageHref(site.slug, contactPage)}
                aria-label={city ? `${contactPage.title} — agence de ${city}` : contactPage.title}
              >
                {contactPage.title}
              </Link>
            ) : null}

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
  MANAGED_PUBLIC_ROUTES,
  NAVIGATION_ALIASES,
  TUI_SHOWCASE_DISABLED_CITIES,
  canonicalNavigationSlug,
  extractSlug,
  isTuiShowcaseDisabled,
  normalizeNavigation,
  normalizePageSlug,
  pageHref,
  pageSlug,
  publishedPageBySlug,
  telephoneHref,
  uniquePublicNavigation,
  uniquePublishedNavigation,
};
