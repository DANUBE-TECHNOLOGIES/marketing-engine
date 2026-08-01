import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../lib/public-site-api";
import PublicSiteSections from "../../../components/public-site/PublicSiteSections";

export async function generateMetadata({
  params,
}) {
  const { siteSlug } = await params;

  try {
    const [site, page] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      publicSiteApi.getHome(siteSlug),
    ]);

    return {
      title:
        page.seoTitle ||
        page.title ||
        site.name,

      description:
        page.seoDescription ||
        site.agency?.description ||
        `Découvrez ${site.name}.`,
    };
  } catch {
    return {};
  }
}

export default async function PublicAgencyHome({
  params,
}) {
  const { siteSlug } = await params;

  let site;
  let page;

  try {
    [site, page] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      publicSiteApi.getHome(siteSlug),
    ]);
  } catch (error) {
    if (error.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <>
      <PublicSiteSections
        site={site}
        page={page}
      />
    </>
  );
}
