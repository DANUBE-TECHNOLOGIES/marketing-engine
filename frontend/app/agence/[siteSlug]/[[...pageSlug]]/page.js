import {
  notFound,
} from "next/navigation";

import {
  publicSiteApi,
} from "../../../../lib/public-site-api";

import LegalJourneyCta from "../../../../components/public-site/LegalJourneyCta";
import PublicSiteSections from "../../../../components/public-site/PublicSiteSections";

import JsonLd from "../../../../components/JsonLd";

import {
  buildBreadcrumbSchema,
  buildTravelAgencySchema,
} from "../../../../lib/seo/json-ld";

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

function isLegalPage(pageSlug, page) {
  const slug = normalizePageSlug(pageSlug || page?.slug);
  if (LEGAL_PAGE_SLUGS.has(slug)) return true;

  const title = String(page?.title || "").trim().toLowerCase();
  return title.includes("mentions légales") || title.includes("confidentialité");
}

function canonicalPath({ siteSlug, pageSlug }) {
  const root = `/agence/${siteSlug}`;
  const slug = normalizePageSlug(pageSlug);

  if (!slug || ["home", "accueil", "index"].includes(slug)) {
    return root;
  }

  return `${root}/${slug}`;
}

function canonicalUrl({ siteSlug, pageSlug }) {
  return PUBLIC_ORIGIN + canonicalPath({ siteSlug, pageSlug });
}

async function loadPage({ siteSlug, pageSlug }) {
  const slug = normalizePageSlug(pageSlug);

  if (!slug || ["home", "accueil", "index"].includes(slug)) {
    return publicSiteApi.getHome(siteSlug);
  }

  return publicSiteApi.getPage(siteSlug, slug);
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
    const [site, page] = await Promise.all([
      publicSiteApi.getSite(resolved.siteSlug),
      loadPage({
        siteSlug: resolved.siteSlug,
        pageSlug,
      }),
    ]);

    const canonical = canonicalUrl({
      siteSlug: resolved.siteSlug,
      pageSlug,
    });
    const title = page.seoTitle || page.title || site.name;
    const description =
      page.metaDescription ||
      page.seoDescription ||
      site.agency?.description ||
      `Découvrez ${site.name}.`;
    const legalPage = isLegalPage(pageSlug, page);

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      robots: {
        index: !legalPage,
        follow: true,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
      },
    };
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

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbItems)} />

      <div data-public-page-kind={legalPage ? "legal" : "content"}>
        <PublicSiteSections
          site={site}
          page={page}
        />

        {legalPage ? <LegalJourneyCta site={site} /> : null}
      </div>
    </>
  );
}
