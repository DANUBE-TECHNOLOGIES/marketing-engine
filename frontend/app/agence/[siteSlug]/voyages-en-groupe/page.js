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

export async function generateMetadata({ params }) {
  const resolved = await params;
  try {
    const site = await publicSiteApi.getSite(resolved.siteSlug);
    if (!site) return { robots: { index: false, follow: false } };
    const city = String(site?.agency?.city || site?.city || "").trim();
    const brand = String(site?.agency?.name || site?.name || "Mondescale Voyages").trim();
    const canonical = `${PUBLIC_ORIGIN}${rootPath(resolved.siteSlug)}/voyages-en-groupe`;
    const title = city ? `Voyages en groupe à ${city} | ${brand}` : `Voyages en groupe | ${brand}`;
    const description = city
      ? `Votre agence à ${city} organise vos voyages de groupe sur mesure : séjours, circuits, croisières et escapades pour associations, CSE, collectivités, familles et amis.`
      : "Votre agence organise vos voyages de groupe sur mesure : séjours, circuits, croisières et escapades, avec un accompagnement de proximité.";
    return {
      title,
      description,
      alternates: { canonical },
      robots: { index: true, follow: true },
      openGraph: { title, description, url: canonical, type: "website", locale: "fr_FR" },
    };
  } catch (error) {
    if (error?.statusCode === 404) return { robots: { index: false, follow: false } };
    throw error;
  }
}

export default async function GroupTravelRoute({ params }) {
  const resolved = await params;
  let site;
  try {
    site = await publicSiteApi.getSite(resolved.siteSlug);
  } catch (error) {
    if (error?.statusCode === 404) notFound();
    throw error;
  }
  if (!site) notFound();

  const root = rootPath(resolved.siteSlug);
  const currentUrl = `${PUBLIC_ORIGIN}${root}/voyages-en-groupe`;
  const homeUrl = `${PUBLIC_ORIGIN}${root}`;
  const city = String(site?.agency?.city || site?.city || site?.name || "").trim();
  const breadcrumbs = [
    { name: "Accueil", path: homeUrl },
    { name: "Voyages en groupe", path: currentUrl },
  ];

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbs)} />
      <div data-public-page-kind="content" data-group-travel="true">
        <PublicBreadcrumbs items={[
          { name: `Agence ${city}`, href: root },
          { name: "Voyages en groupe", href: `${root}/voyages-en-groupe` },
        ]} />
        <GroupTravelPage site={site} />
        <PublicReassuranceBand />
      </div>
    </>
  );
}
