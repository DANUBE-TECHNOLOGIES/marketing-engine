import { notFound } from "next/navigation";
import AgencySiteShell from "../../../../components/agency-site/AgencySiteShell";
import { getAgencyPage, getAgencySite } from "../../../../lib/agency-site-api";
import "../../../../components/agency-site/agency-site.css";
import JsonLd from "../../../../components/JsonLd";
import { buildBreadcrumbSchema, buildTravelAgencySchema } from "../../../../lib/seo/json-ld";

export async function generateMetadata({ params }) {
  const resolved = await params;
  const slug = resolved.pageSlug?.[0] || "";
  const page = await getAgencyPage(resolved.siteSlug, slug);
  if (!page) return {};
  return { title: page.seoTitle || page.title, description: page.metaDescription || undefined, alternates: { canonical: page.path } };
}

export default async function AgencySitePage({ params }) {
  const resolved = await params;
  const pageSlug = resolved.pageSlug?.[0] || "";
  if ((resolved.pageSlug?.length || 0) > 1) notFound();
  const [site, page] = await Promise.all([getAgencySite(resolved.siteSlug), getAgencyPage(resolved.siteSlug, pageSlug)]);
  if (!site || !page) notFound();
  const breadcrumbItems = [
    { name: "Accueil", path: site.basePath },
  ];

  if (page.path !== site.basePath) {
    breadcrumbItems.push({
      name: page.title,
      path: page.path,
    });
  }

  return (
    <>
      <JsonLd data={buildTravelAgencySchema(site)} />
      <JsonLd data={buildBreadcrumbSchema(breadcrumbItems)} />
      <AgencySiteShell site={site} page={page} />
    </>
  );
}
