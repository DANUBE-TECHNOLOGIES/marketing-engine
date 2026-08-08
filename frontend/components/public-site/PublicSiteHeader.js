import Link from "next/link";

import PublicBrandLogo from "./PublicBrandLogo";

function normalizeNavigation(site) {
  if (Array.isArray(site.navigation)) {
    return site.navigation;
  }

  if (Array.isArray(site.navigation?.main)) {
    return site.navigation.main;
  }

  return [];
}

function extractSlug(path = "") {
  const parts = String(path)
    .split("/")
    .filter(Boolean);

  return parts.at(-1) || "";
}

function pageHref(siteSlug, page) {
  const slug =
    page.slug !== undefined
      ? page.slug
      : extractSlug(page.path);

  if (!slug || page.title === "Accueil") {
    return `/sites/${siteSlug}`;
  }

  return `/sites/${siteSlug}/${slug}`;
}

function telephoneHref(phone) {
  return `tel:${String(phone || "").replace(/\s+/g, "")}`;
}

export default function PublicSiteHeader({
  site,
  hours,
  brand,
  brandRuntime,
  brandAssets,
}) {
  const resolvedPublicBrand =
    brand ||
    brandRuntime?.runtime?.brand ||
    site?.brand ||
    site?.branding ||
    site?.brandProfile ||
    null;

  const resolvedPublicBrandAssets =
    brandAssets ||
    resolvedPublicBrand?.assets ||
    {};

  const pages = normalizeNavigation(site).filter(
    (page) =>
      page.title &&
      page.title !== "Mentions légales" &&
      page.title !== "Confidentialité"
  );

  const agency = site.agency || {};

  return (
    <>
      <div className="public-site-trustbar">
        <div className="public-site-container public-site-trustbar-inner">
          <span>
            Votre agence de voyages de proximité
          </span>

          <div className="public-site-trustbar-items">
            {hours?.status ? (
              <span
                className={[
                  "public-site-opening-status",
                  hours.status.isOpen
                    ? "is-open"
                    : "is-closed",
                ].join(" ")}
              >
                <i />
                {hours.status.label}
              </span>
            ) : null}

            <span>Conseils personnalisés</span>
            <span>
              Accompagnement avant, pendant et après
            </span>
          </div>
        </div>
      </div>

      <header className="public-site-header">
      <PublicBrandLogo
        brand={
          resolvedPublicBrand
        }
        brandAssets={
          resolvedPublicBrandAssets
        }
        site={
          site
        }
        agency={
          agency
        }
        className="public-site-header__brand-logo"
      />

        <div className="public-site-container public-site-header-inner">
          <Link
            href={`/sites/${site.slug}`}
            className="public-site-brand"
          >
            <span className="public-site-brand-mark">
              M
            </span>

            <span className="public-site-brand-copy">
              <strong>
                {site.name}
              </strong>

              {agency.city ? (
                <small>
                  Agence de voyages à {agency.city}
                </small>
              ) : null}
            </span>
          </Link>

          <nav
            className="public-site-navigation"
            aria-label="Navigation principale"
          >
            {pages.map((page, index) => (
              <Link
                key={
                  page.id ||
                  page.path ||
                  `${page.title}-${index}`
                }
                href={pageHref(site.slug, page)}
              >
                {page.title}
              </Link>
            ))}
          </nav>

          <div className="public-site-header-actions">
            {agency.phone ? (
              <a
                className="public-site-header-phone"
                href={telephoneHref(agency.phone)}
              >
                <span className="public-site-header-phone-label">
                  Appelez-nous
                </span>

                <strong>
                  {agency.phone}
                </strong>
              </a>
            ) : null}

            <Link
              className="public-site-header-cta"
              href={`/sites/${site.slug}/contact`}
            >
              Demander un devis
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}
