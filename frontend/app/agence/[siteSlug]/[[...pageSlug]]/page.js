import {
  notFound,
} from "next/navigation";

import {
  publicSiteApi,
} from "../../../../lib/public-site-api";

import LegalJourneyCta from "../../../../components/public-site/LegalJourneyCta";
import LegalRuntimeDocument from "../../../../components/public-site/LegalRuntimeDocument";
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

import {
  buildLocalPageSeo,
} from "../../../../lib/seo/local-page-seo";

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

function normalizePageSlug(value) {
  return String(value || "").trim().toLowerCase();
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

function canonicalPath({ siteSlug, pageSlug }) {
  const root = `/agence/${siteSlug}`;
  const slug = normalizePageSlug(pageSlug);

  if (isHomePage(slug)) {
    return root;
  }

  return `${root}/${slug}`;
}

function canonicalUrl({ siteSlug, pageSlug }) {
  return PUBLIC_ORIGIN + canonicalPath({ siteSlug, pageSlug });
}

async function loadPage({ siteSlug, pageSlug }) {
  const slug = normalizePageSlug(pageSlug);

  if (isHomePage(slug)) {
    return publicSiteApi.getHome(siteSlug);
  }

  return publicSiteApi.getPage(siteSlug, slug);
}

function metadataImages(image) {
  return image ? [{ url: image }] : undefined;
}

export async function generateMetadata({ params }) {
  const resolved = await params;

  if ((resolved.pageSlug?.length || 0) > 1) {
    return {
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const pageSlug = resolved.pageSlug?.[0] || "";

  try {
    const [site, page, runtime] = await Promise.all([
      publicSiteApi.getSite(resolved.siteSlug),
      loadPage({
        siteSlug: resolved.siteSlug,
        pageSlug,
      }),
      fetchPublicBrandLegalRuntime(resolved.siteSlug),
    ]);

    const canonical = canonicalUrl({
      siteSlug: resolved.siteSlug,
      pageSlug,
    });
    const localSeo = buildLocalPageSeo({
      site,
      page,
      pageSlug,
    });
    const title =
      page.seoTitle ||
      localSeo.title;
    const description =
      page.metaDescription ||
      page.seoDescription ||
      localSeo.description;
    const legalPage = isLegalPage(pageSlug, page);
    const images = metadataImages(localSeo.image);

    return mergePublicMetadata(
      {
        title,
        description,
        alternates: {
          canonical,
        },
        robots: {
          index: !legalPage,
          follow: true,
          googleBot: {
            index: !legalPage,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
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
          card: localSeo.image ? "summary_large_image" : "summary",
          title,
          description,
          images: localSeo.image ? [localSeo.image] : undefined,
        },
      },
      runtime
    );
  } catch (error) {
    if (error?.statusCode === 404) {
      return {
        robots: {
          index: false,
          follow: false,
        },
      };
    }

    throw error;
  }
}

export default async function AgencySitePage({ params }) {
  const resolved = await params;

  if ((resolved.pageSlug?.length || 0) > 1) {
    notFound();
  }

  const pageSlug = resolved.pageSlug?.[0] || "";

  let site;
  let page;

  try {
    [site, page] = await Promise.all([
      publicSiteApi.getSite(resolved.siteSlug),
      loadPage({
        siteSlug: resolved.siteSlug,
        pageSlug,
      }),
    ]);
  } catch (error) {
    if (error?.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  if (!site || !page) {
    notFound();
  }

  const homeUrl = canonicalUrl({
    siteSlug: resolved.siteSlug,
    pageSlug: "",
  });
  const currentUrl = canonicalUrl({
    siteSlug: resolved.siteSlug,
    pageSlug,
  });
  const localSeo = buildLocalPageSeo({
    site,
    page,
    pageSlug,
  });
  const pageTitle = page.seoTitle || localSeo.title;
  const pageDescription =
    page.metaDescription ||
    page.seoDescription ||
    localSeo.description;
  const breadcrumbItems = [
    {
      name: "Accueil",
      path: homeUrl,
    },
  ];

  if (currentUrl !== homeUrl) {
    breadcrumbItems.push({
      name: page.title,
      path: currentUrl,
    });
  }

  const legalPage = isLegalPage(pageSlug, page);
  const servicesPage = isServicesPage(pageSlug, page);
  const serviceCatalog = servicesPage
    ? buildServiceCatalogSchema(site, page)
    : null;
  const webPageSchema = buildLocalWebPageSchema({
    site,
    page,
    url: currentUrl,
    title: pageTitle,
    description: pageDescription,
  });
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
      {serviceCatalog ? <JsonLd data={serviceCatalog} /> : null}

      <div data-public-page-kind={legalPage ? "legal" : "content"}>
        {legalPage && legalRuntimeHtml ? (
          <LegalRuntimeDocument
            title={page.title}
            html={legalRuntimeHtml}
          />
        ) : (
          <PublicSiteSections
            site={site}
            page={page}
          />
        )}

        {legalPage ? <LegalJourneyCta site={site} /> : null}
      </div>
    </>
  );
}

export {
  canonicalPath,
  canonicalUrl,
  isHomePage,
  isLegalPage,
  isServicesPage,
};
