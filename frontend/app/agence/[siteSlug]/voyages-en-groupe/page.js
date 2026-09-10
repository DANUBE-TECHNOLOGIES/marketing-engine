import { notFound } from "next/navigation";

import GroupTravelPage from "../../../../components/public-site/GroupTravelPage";
import PublicBreadcrumbs from "../../../../components/public-site/PublicBreadcrumbs";
import PublicReassuranceBand from "../../../../components/public-site/PublicReassuranceBand";
import JsonLd from "../../../../components/JsonLd";
import { publicSiteApi } from "../../../../lib/public-site-api";
import { buildBreadcrumbSchema, buildTravelAgencySchema } from "../../../../lib/seo/json-ld";

const PUBLIC_ORIGIN = String(process.env.NEXT_PUBLIC_SITE_ORIGIN || "https://agences.mondescale.com").replace(/\/+$/g, "");

function rootPath(siteSlug) {
  return `/agence/${siteSlug}`;
}

function routePath(siteSlug) {
  return `${rootPath(siteSlug)}/voyages-en-groupe`;
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
  const resolved = await params;
  const site = await loadSite(resolved.siteSlug);
  if (!site) return { robots: { index: false, follow: false } };

  const city = cityName(site);
  const canonical = `${PUBLIC_ORIGIN}${routePath(resolved.siteSlug)}`;
  const title = city
    ? `Voyages en groupe à ${city} | Mondescale`
    : "Voyages en groupe | Mondescale";
  const description = city
    ? `Informations publiques et coordonnées de l’agence Mondescale à ${city} pour les demandes liées aux voyages en groupe.`
    : "Informations publiques et coordonnées de l’agence Mondescale pour les demandes liées aux voyages en groupe.";

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: { title, description, url: canonical, type: "website", locale: "fr_FR" },
  };
}

export default async function GroupTravelRoute({ params }) {
  const resolved = await params;
  const site = await loadSite(resolved.siteSlug);
  if (!site) notFound();

  const root = rootPath(resolved.siteSlug);
  const currentPath = routePath(resolved.siteSlug);
  const currentUrl = `${PUBLIC_ORIGIN}${currentPath}`;
  const homeUrl = `${PUBLIC_ORIGIN}${root}`;
  const city = cityName(site);
  const label = city ? `Voyages en groupe à ${city}` : "Voyages en groupe";
  const breadcrumbs = [
    { name: "Accueil", path: homeUrl },
    { name: label, path: currentUrl },
  ];

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <div data-public-page-kind="content" data-content-quality="grounded" data-group-travel="true">
        <PublicBreadcrumbs items={[
          { name: city ? `Agence ${city}` : site?.name || "Agence", href: root },
          { name: label, href: currentPath },
        ]} />
        <GroupTravelPage site={site} />
        <PublicReassuranceBand />
      </div>
    </>
  );
}

export { cityName, loadSite, rootPath, routePath };
