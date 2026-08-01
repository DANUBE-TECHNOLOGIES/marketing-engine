import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../lib/public-site-api";
import { getPublicBrandTheme } from "../../../lib/public-brand-api";
import PublicSiteHeader from "../../../components/public-site/PublicSiteHeader";
import PublicSiteFooter from "../../../components/public-site/PublicSiteFooter";

import "./public-site.css";

export default async function PublicAgencySiteLayout({
  children,
  params,
}) {
  const { siteSlug } = await params;

  let site;
  let brandTheme = null;

  try {
    [site, brandTheme] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      getPublicBrandTheme(),
    ]);
  } catch (error) {
    if (error.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <div
      className="public-site-shell"
      style={
        brandTheme?.cssVariables || undefined
      }
    >
      <PublicSiteHeader site={site} />

      <main>{children}</main>

      <PublicSiteFooter site={site} />
    </div>
  );
}
