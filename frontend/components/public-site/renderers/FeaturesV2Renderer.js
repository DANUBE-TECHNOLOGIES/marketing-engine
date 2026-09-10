import Link from "next/link";

import {
  getSectionContent,
  getSectionTitle,
} from "./helpers";
import {
  pageHref,
  pageSlug,
  uniquePublishedNavigation,
} from "../PublicSiteHeader";

const RELATED_FEATURE_PAGE_SLUGS = new Set(["destinations", "inspiration", "contact"]);

const MANAGED_FEATURE_ACTIONS = Object.freeze([
  {
    pattern: /\b(voyages?\s+d['’]?affaires|business\s+travel|deplacements?\s+professionnels?)\b/i,
    slug: "business-travel",
    label: "Découvrir nos solutions Business Travel",
  },
  {
    pattern: /\b(voyages?\s+en\s+groupe|voyages?\s+de\s+groupe|groupes?)\b/i,
    slug: "voyages-en-groupe",
    label: "Découvrir les voyages en groupe",
  },
]);

function normalizeColumns(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 3;
  return Math.max(1, Math.min(4, Math.trunc(parsed)));
}

function minimumCardWidth(columns) {
  if (columns >= 4) return 200;
  if (columns === 3) return 250;
  if (columns === 2) return 340;
  return 520;
}

function siteRoot(site) {
  return String(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`)
    .replace(/\/$/, "");
}

function localCity(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

function featureHref(root, value) {
  const href = String(value || "").trim();
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|\/)/i.test(href)) return href;
  return `${root}/${href.replace(/^\/+|\/+$/g, "")}`;
}

function managedFeatureAction(root, item) {
  const searchable = [item?.title, item?.label, item?.name, item?.text]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const managed = MANAGED_FEATURE_ACTIONS.find((entry) => entry.pattern.test(searchable));
  return managed ? { href: `${root}/${managed.slug}`, label: managed.label } : null;
}

function featureAction(root, item) {
  const href = featureHref(root, item?.href || item?.url || item?.link);
  const label = String(item?.ctaLabel || item?.linkLabel || item?.actionLabel || "").trim();
  if (href && label) return { href, label };
  return managedFeatureAction(root, item);
}

function serviceItems(sourceItems) {
  return Array.isArray(sourceItems) ? sourceItems.filter(Boolean) : [];
}

function defaultFeaturesTitle(site) {
  const city = localCity(site);
  return city ? `Services publiés à ${city}` : "Services publiés";
}

function defaultFeaturesIntroduction(site) {
  const city = localCity(site);
  return city
    ? `Retrouvez les services publiés par votre agence de voyages à ${city}.`
    : "Retrouvez les services publiés par votre agence de voyages.";
}

function relatedPublishedPages(site) {
  return uniquePublishedNavigation(site)
    .filter((page) => RELATED_FEATURE_PAGE_SLUGS.has(pageSlug(page)))
    .map((page) => ({
      slug: pageSlug(page),
      title: page.title,
      href: pageHref(site.slug, page),
    }));
}

export default function FeaturesV2Renderer({ section, site }) {
  const content = getSectionContent(section);
  const items = serviceItems(content.items);
  const introduction = content.introduction || content.text || content.description || defaultFeaturesIntroduction(site);
  const columns = normalizeColumns(content.columns);
  const minimum = minimumCardWidth(columns);
  const root = siteRoot(site);
  const relatedPages = relatedPublishedPages(site);

  return (
    <section className="public-site-section public-site-features">
      <div className="public-site-container">
        <p className="public-site-section-kicker">Services publiés</p>
        <h2>{getSectionTitle(section, defaultFeaturesTitle(site))}</h2>
        {introduction ? <p className="public-site-section-intro">{introduction}</p> : null}
        {items.length ? (
          <div className="public-site-card-grid" data-columns={columns} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minimum}px), 1fr))` }}>
            {items.map((item, index) => {
              const action = featureAction(root, item);
              const heading = item.title || item.label;
              return (
                <article className="public-site-card public-site-feature-card" key={item.id || item.title || index}>
                  {item.icon ? <span className="public-site-feature-icon" aria-hidden="true">{item.icon}</span> : null}
                  {heading ? <h3>{heading}</h3> : null}
                  {item.text ? <p>{item.text}</p> : null}
                  {item.description ? <p>{item.description}</p> : null}
                  {action ? <Link className="public-site-feature-action" href={action.href}>{action.label} <span aria-hidden="true">→</span></Link> : null}
                </article>
              );
            })}
          </div>
        ) : null}
        {relatedPages.length ? (
          <nav className="public-site-related-links" aria-label="Pages publiées associées">
            {relatedPages.map((page) => (
              <Link href={page.href} key={page.slug}>{page.title}</Link>
            ))}
          </nav>
        ) : null}
      </div>
    </section>
  );
}

export {
  MANAGED_FEATURE_ACTIONS,
  RELATED_FEATURE_PAGE_SLUGS,
  defaultFeaturesIntroduction,
  defaultFeaturesTitle,
  featureAction,
  featureHref,
  localCity,
  managedFeatureAction,
  relatedPublishedPages,
  serviceItems,
  siteRoot,
};
