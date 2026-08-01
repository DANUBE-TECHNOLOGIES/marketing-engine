import Link from "next/link";

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
  const pageSlug =
    page.slug !== undefined
      ? page.slug
      : extractSlug(page.path);

  if (
    !pageSlug ||
    page.title === "Accueil"
  ) {
    return `/sites/${siteSlug}`;
  }

  return `/sites/${siteSlug}/${pageSlug}`;
}

export default function PublicSiteHeader({
  site,
}) {
  const pages = normalizeNavigation(site).filter(
    (page) =>
      page.title &&
      page.title !== "Mentions légales" &&
      page.title !== "Confidentialité"
  );

  return (
    <header className="public-site-header">
      <div className="public-site-container public-site-header-inner">
        <Link
          href={`/sites/${site.slug}`}
          className="public-site-brand"
        >
          <span className="public-site-brand-name">
            {site.name}
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
      </div>
    </header>
  );
}
