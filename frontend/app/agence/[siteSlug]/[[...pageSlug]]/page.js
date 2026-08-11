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
  buildServiceCatalogSchema,
  buildTravelAgencySchema,
  extractPublishedServices,
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

function localHomeTitle(site) {
  const agency = site?.agency || {};
  const city = String(agency.city || "").trim();
  const name = String(site?.name || agency.name || "Mondescale Voyages").trim();
  return city ? `Agence de voyages à ${city} | ${name}` : name;
}

function localHomeDescription(site) {
  const agency = site?.agency || {};
  const city = String(agency.city || "").trim();
  const name = String(site?.name || agency.name || "Mondescale Voyages").trim();
  const expertise = String(agency.description || "").trim();
  const localLead = city
    ? `${name}, agence de voyages à ${city} : conseils personnalisés, séjours, circuits, croisières et voyages sur mesure.`
    : `${name} : conseils personnalisés, séjours, circuits, croisières et voyages sur mesure.`;

  return expertise ? `${localLead} ${expertise}`.slice(0, 300).trim() : localLead;
}

function localServicesTitle(site) {
  const city = String(site?.agency?.city || "").trim();
  const name = String(site?.name || "Mondescale Voyages").trim();
  return city ? `Services de voyage à ${city} | ${name}` : `Services de voyage | ${name}`;
}

function localServicesDescription(site, page) {
  const city = String(site?.agency?.city || "").trim();
  const name = String(site?.name || "Mondescale Voyages").trim();
  const services = extractPublishedServices(page)
    .slice(0, 5)
    .map((service) => service.name);
  const expertise = services.length
    ? ` Expertises : ${services.join(", ")}.`
    : "";
  const lead = city
    ? `Découvrez les services de ${name}, votre agence de voyages à ${city}, et bénéficiez de conseils adaptés à votre projet.`
    : `Découvrez les services de ${name} et bénéficiez de conseils adaptés à votre projet.`;

  return `${lead}${expertise}`.slice(0, 300).trim();
}

async function loadPage({ siteSlug, pageSlug }) {
  const slug = normalizePageSlug(pageSlug);

  if (isHomePage(slug)) {
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
    const homePage = isHomePage(pageSlug);
    const servicesPage = isServicesPage(pageSlug, page);
    const title =
      page.seoTitle ||
      (homePage
        ? localHomeTitle(site)
        : servicesPage
          ? localServicesTitle(site)
          : page.title || site.name);
    const description =
      page.metaDescription ||
      page.seoDescription ||
      (homePage
        ? localHomeDescription(site)
        : servicesPage
          ? localServicesDescription(site, page)
          : site.agency?.description || `Découvrez ${site.name}.`);
    const legalPage = isLegalPage(pageSlug, page);

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
        },
        openGraph: {
          title,
          description,
          url: canonical,
          type: "website",
          locale: "fr_FR",
          siteName: site.name || "Mondescale Voyages",
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
  let legalRuntimeHtml = null;

  if (legalPage) {
    const runtime = await fetchPublicBrandLegalRuntime(resolved.siteSlug);
    legalRuntimeHtml = resolveLegalPageHtml(pageSlug, runtime);
  }

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbItems)} />
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
  localHomeDescription,
  localHomeTitle,
  localServicesDescription,
  localServicesTitle,
};
