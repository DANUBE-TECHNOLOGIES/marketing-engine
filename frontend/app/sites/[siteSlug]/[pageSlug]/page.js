import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../../lib/public-site-api";
import PublicSiteSections from "../../../../components/public-site/PublicSiteSections";

export async function generateMetadata({
  params,
}) {
  const { siteSlug, pageSlug } =
    await params;

  try {
    const page =
      await publicSiteApi.getPage(
        siteSlug,
        pageSlug
      );

    return {
      title:
        page.seoTitle ||
        page.title,

      description:
        page.seoDescription ||
        page.summary ||
        undefined,
    };
  } catch {
    return {};
  }
}

export default async function PublicAgencyPage({
  params,
}) {
  const { siteSlug, pageSlug } =
    await params;

  let site;
  let page;

  try {
    [site, page] = await Promise.all([
      publicSiteApi.getSite(siteSlug),

      publicSiteApi.getPage(
        siteSlug,
        pageSlug
      ),
    ]);
  } catch (error) {
    if (error.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <PublicSiteSections
      site={site}
      page={page}
    />
  );
}
