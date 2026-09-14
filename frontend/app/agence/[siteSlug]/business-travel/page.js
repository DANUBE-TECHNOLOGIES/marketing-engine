import { notFound } from "next/navigation";

import BusinessTravelPage from "../../../../components/public-site/BusinessTravelPage";
import PublicBreadcrumbs from "../../../../components/public-site/PublicBreadcrumbs";
import PublicReassuranceBand from "../../../../components/public-site/PublicReassuranceBand";
import JsonLd from "../../../../components/JsonLd";
import { publicSiteApi } from "../../../../lib/public-site-api";
import { buildBreadcrumbSchema, buildTravelAgencySchema } from "../../../../lib/seo/json-ld";

const PUBLIC_ORIGIN = String(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com").replace(/\/+$/g, "");

function routePath(siteSlug) {
  return `/agence/${siteSlug}/business-travel`;
}

function cityName(site) {
  return String(site?.agency?.city || site?.city || "").trim();
}

async function loadSite(siteSlug) {
  try {
    const site = await publicSiteApi.getSite(siteSlug);
    return site || null;
  } catch (error) {
    if (error?.statusCode === 404) return null;
    throw error;
  }
}

export async function generateMetadata({ params }) {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);
  if (!site) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const city = cityName(site);
  const canonical = `${PUBLIC_ORIGIN}${routePath(siteSlug)}`;
  const title = city
    ? `Voyages d’affaires à ${city} | Mondescale`
    : "Voyages d’affaires | Mondescale";
  const description = city
    ? `Informations publiques et coordonnées de l’agence Mondescale à ${city} pour les demandes liées aux voyages d’affaires.`
    : "Informations publiques et coordonnées de l’agence Mondescale pour les demandes liées aux voyages d’affaires.";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: canonical, type: "website", locale: "fr_FR", siteName: site?.name || "Mondescale Voyages" },
    twitter: { card: "summary", title, description },
  };
}

export default async function AgencyBusinessTravelRoute({ params }) {
  const { siteSlug } = await params;
  const site = await loadSite(siteSlug);
  if (!site) notFound();

  const city = cityName(site);
  const homePath = `/agence/${siteSlug}`;
  const currentPath = routePath(siteSlug);
  const homeUrl = `${PUBLIC_ORIGIN}${homePath}`;
  const currentUrl = `${PUBLIC_ORIGIN}${currentPath}`;
  const label = city ? `Voyages d’affaires à ${city}` : "Voyages d’affaires";

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema([
        { name: "Accueil", path: homeUrl },
        { name: label, path: currentUrl },
      ])} />
      <div data-public-page-kind="content" data-content-quality="grounded">
        <PublicBreadcrumbs items={[
          { name: city ? `Agence ${city}` : site?.name || "Agence", href: homePath },
          { name: label, href: currentPath },
        ]} />
        <BusinessTravelPage site={site} />
        <PublicReassuranceBand />
      </div>
    </>
  );
}

export { cityName, loadSite, routePath };
