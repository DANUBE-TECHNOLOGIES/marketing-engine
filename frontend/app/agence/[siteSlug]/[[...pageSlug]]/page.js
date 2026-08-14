import {
  notFound,
  permanentRedirect,
} from "next/navigation";

import {
  publicSiteApi,
} from "../../../../lib/public-site-api";

import LegalJourneyCta from "../../../../components/public-site/LegalJourneyCta";
import LegalRuntimeDocument from "../../../../components/public-site/LegalRuntimeDocument";
import LocalContentContext from "../../../../components/public-site/LocalContentContext";
import LocalSeoAreaLinks from "../../../../components/public-site/LocalSeoAreaLinks";
import PublicBreadcrumbs from "../../../../components/public-site/PublicBreadcrumbs";
import PublicSiteSections from "../../../../components/public-site/PublicSiteSections";

import JsonLd from "../../../../components/JsonLd";

import {
  fetchPublicBrandLegalRuntime,
  mergePublicMetadata,
  resolveLegalPageHtml,
} from "../../../../lib/public-brand-legal-runtime";

import {
  buildBreadcrumbSchema,
  buildLocalWebPageSchema,
  buildServiceCatalogSchema,
  buildTravelAgencySchema,
} from "../../../../lib/seo/json-ld";
import { buildPageFaqSchema } from "../../../../lib/seo/page-faq-schema";
import { buildPageSemanticsSchema } from "../../../../lib/seo/page-semantics-schema";
import { assessLocalContentQuality } from "../../../../lib/seo/local-content-quality";
import {
  buildLocalPageSeo,
} from "../../../../lib/seo/local-page-seo";
import { absoluteUrl } from "../../../../lib/seo/site-url";

const PUBLIC_ORIGIN = String(
  process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
).replace(/\/+$/g, "");

const LEGAL_PAGE_SLUGS = new Set([
  "mentions-legales",
  "mentions_legales",
  "confidentialite",
  "politique-de-confidentialite",
  "privacy",
]);

const PAGE_ALIASES = Object.freeze({
  home: "",
  accueil: "",
  index: "",
  inspirations: "inspiration",
});

function normalizePageSlug(value) {
  return String(value || "").trim().toLowerCase();
}

function canonicalPageSlug(value) {
  const slug = normalizePageSlug(value);
  return Object.prototype.hasOwnProperty.call(PAGE_ALIASES, slug)
    ? PAGE_ALIASES[slug]
    : slug;
}

function isAliasPage(value) {
  const slug = normalizePageSlug(value);
  return Object.prototype.hasOwnProperty.call(PAGE_ALIASES, slug);
}

function isHomePage(pageSlug) {
  const slug = normalizePageSlug(pageSlug);
  return !slug || ["home", "accueil", "index"].includes(slug);
}

function isServicesPage(pageSlug, page) {
  const slug = normalizePageSlug(pageSlug || page?.slug);
  return slug === "services";
}

function isLegalPage(pageSlug, page) {
  const slug = normalizePageSlug(pageSlug || page?.slug);
  if (LEGAL_PAGE_SLUGS.has(slug)) return true;
  const title = String(page?.title || "").trim().toLowerCase();
  return title.includes("mentions légales") || title.includes("confidentialité");
}

function pageSections(page) {
  if (Array.isArray(page?.sections)) return page.sections;
  if (Array.isArray(page?.blocks)) return page.blocks;
  return [];
}

function pageHasHero(page) {
  return pageSections(page).some((section) => {
    const type = String(section?.type || section?.blockType || section?.kind || "")
      .trim()
      .toLowerCase();
    return type === "hero" || type.includes("hero-") || type.includes("-hero");
  });
}

function canonicalPath({ siteSlug, pageSlug }) {
  const root = `/agence/${siteSlug}`;
  const slug = canonicalPageSlug(pageSlug);
  if (!slug || isHomePage(slug)) return root;
  return `${root}/${slug}`;
}

function canonicalUrl({ siteSlug, pageSlug }) {
  return PUBLIC_ORIGIN + canonicalPath({ siteSlug, pageSlug });
}

async function loadPage({ siteSlug, pageSlug }) {
  const slug = normalizePageSlug(pageSlug);
  if (isHomePage(slug)) return publicSiteApi.getHome(siteSlug);
  return publicSiteApi.getPage(siteSlug, slug);
}

function absoluteMetadataImage(image) {
  return image ? absoluteUrl(image) : null;
}

function metadataImages(image) {
  const url = absoluteMetadataImage(image);
  return url ? [{ url }] : undefined;
}

export async function generateMetadata({ params }) {
  const resolved = await params;
  if ((resolved.pageSlug?.length || 0) > 1) {
    return { robots: { index: false, follow: false } };
  }
  const pageSlug = resolved.pageSlug?.[0] || "";
  if (isAliasPage(pageSlug)) {
    return {
      alternates: { canonical: canonicalUrl({ siteSlug: resolved.siteSlug, pageSlug }) },
      robots: { index: false, follow: true },
    };
  }
  try {
    const [site, page, runtime] = await Promise.all([
      publicSiteApi.getSite(resolved.siteSlug),
      loadPage({ siteSlug: resolved.siteSlug, pageSlug }),
      fetchPublicBrandLegalRuntime(resolved.siteSlug),
    ]);
    const canonical = canonicalUrl({ siteSlug: resolved.siteSlug, pageSlug });
    const localSeo = buildLocalPageSeo({ site, page, pageSlug });
    const quality = assessLocalContentQuality({ site, page });
    const title = localSeo.title;
    const description = localSeo.description;
    const legalPage = isLegalPage(pageSlug, page);
    const indexable = !legalPage && !quality.criticallyThin;
    const socialImage = absoluteMetadataImage(localSeo.image);
    const images = metadataImages(localSeo.image);
    return mergePublicMetadata({
      title,
      description,
      alternates: { canonical },
      robots: {
        index: indexable,
        follow: true,
        googleBot: {
          index: indexable,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
          "max-video-preview": -1,
        },
      },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        locale: "fr_FR",
        siteName: site.name || "Mondescale Voyages",
        images,
      },
      twitter: {
        card: socialImage ? "summary_large_image" : "summary",
        title,
        description,
        images: socialImage ? [socialImage] : undefined,
      },
    }, runtime);
  } catch (error) {
    if (error?.statusCode === 404) return { robots: { index: false, follow: false } };
    throw error;
  }
}

export default async function AgencySitePage({ params }) {
  const resolved = await params;
  if ((resolved.pageSlug?.length || 0) > 1) notFound();
  const pageSlug = resolved.pageSlug?.[0] || "";
  if (isAliasPage(pageSlug)) {
    permanentRedirect(canonicalPath({ siteSlug: resolved.siteSlug, pageSlug }));
  }

  let site;
  let page;
  try {
    [site, page] = await Promise.all([
      publicSiteApi.getSite(resolved.siteSlug),
      loadPage({ siteSlug: resolved.siteSlug, pageSlug }),
    ]);
  } catch (error) {
    if (error?.statusCode === 404) notFound();
    throw error;
  }
  if (!site || !page) notFound();

  const homePath = canonicalPath({ siteSlug: resolved.siteSlug, pageSlug: "" });
  const currentPath = canonicalPath({ siteSlug: resolved.siteSlug, pageSlug });
  const homeUrl = canonicalUrl({ siteSlug: resolved.siteSlug, pageSlug: "" });
  const currentUrl = canonicalUrl({ siteSlug: resolved.siteSlug, pageSlug });
  const localSeo = buildLocalPageSeo({ site, page, pageSlug });
  const quality = assessLocalContentQuality({ site, page });
  const breadcrumbItems = [{ name: "Accueil", path: homeUrl }];
  const visibleBreadcrumbItems = [{ name: `Agence ${site?.agency?.city || site?.city || site.name}`, href: homePath }];
  if (currentUrl !== homeUrl) {
    breadcrumbItems.push({ name: page.title, path: currentUrl });
    visibleBreadcrumbItems.push({ name: page.title || localSeo.heading, href: currentPath });
  }

  const legalPage = isLegalPage(pageSlug, page);
  const servicesPage = isServicesPage(pageSlug, page);
  const serviceCatalog = servicesPage ? buildServiceCatalogSchema(site, page) : null;
  const faqSchema = legalPage ? null : buildPageFaqSchema(page);
  const webPageSchema = buildLocalWebPageSchema({
    site,
    page,
    url: currentUrl,
    title: localSeo.title,
    description: localSeo.description,
    image: localSeo.image,
  });
  const pageSemanticsSchema = buildPageSemanticsSchema({ page, url: currentUrl });
  const needsFallbackHeading = !legalPage && !pageHasHero(page);
  let legalRuntimeHtml = null;
  if (legalPage) {
    const runtime = await fetchPublicBrandLegalRuntime(resolved.siteSlug);
    legalRuntimeHtml = resolveLegalPageHtml(pageSlug, runtime);
  }

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbItems)} />
      <JsonLd data={webPageSchema} />
      {pageSemanticsSchema ? <JsonLd data={pageSemanticsSchema} /> : null}
      {serviceCatalog ? <JsonLd data={serviceCatalog} /> : null}
      {faqSchema ? <JsonLd data={faqSchema} /> : null}

      <div
        data-public-page-kind={legalPage ? "legal" : "content"}
        data-content-quality={quality.criticallyThin ? "critical" : quality.thin ? "thin" : quality.strong ? "strong" : "standard"}
      >
        {!isHomePage(pageSlug) ? <PublicBreadcrumbs items={visibleBreadcrumbItems} /> : null}

        {legalPage && legalRuntimeHtml ? (
          <LegalRuntimeDocument title={page.title} html={legalRuntimeHtml} />
        ) : (
          <>
            {needsFallbackHeading ? (
              <section className="public-site-section public-site-page-heading">
                <div className="public-site-container public-site-prose">
                  <p className="public-site-eyebrow">{site.name}</p>
                  <h1>{localSeo.heading}</h1>
                </div>
              </section>
            ) : null}
            <PublicSiteSections site={site} page={page} />
          </>
        )}

        {!legalPage && isHomePage(pageSlug) ? <LocalSeoAreaLinks site={site} /> : null}
        {!legalPage && !isHomePage(pageSlug) ? (
          <LocalContentContext site={site} kind={localSeo.kind} quality={quality} />
        ) : null}
        {legalPage ? <LegalJourneyCta site={site} /> : null}
      </div>
    </>
  );
}

export {
  PAGE_ALIASES,
  absoluteMetadataImage,
  canonicalPageSlug,
  canonicalPath,
  canonicalUrl,
  isAliasPage,
  isHomePage,
  isLegalPage,
  isServicesPage,
  pageHasHero,
  pageSections,
};