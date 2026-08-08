import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../lib/public-site-api";
import { getPublicBrandTheme } from "../../../lib/public-brand-api";
import { getPublicHours } from "../../../lib/public-hours-api";
import PublicSiteHeader from "../../../components/public-site/PublicSiteHeader";
import PublicSiteFooter from "../../../components/public-site/PublicSiteFooter";

import "./public-site.css";

import MiniSiteStructuredData from "../../../components/public-site/MiniSiteStructuredData";
import PublicBrandLegalRuntime from "../../../components/public-site/PublicBrandLegalRuntime";
import {
  fetchPublicBrandLegalRuntime,
  runtimeBrandAssets,
} from "../../../lib/public-brand-legal-runtime";
export default async function PublicAgencySiteLayout({
  children,
  params,
}) {
  const brandLegalResolvedParams =
    await params;

  const publicBrandLegalRuntime =
    await fetchPublicBrandLegalRuntime(
      brandLegalResolvedParams.siteSlug
    );

  const publicBrandAssets =
    runtimeBrandAssets(
      publicBrandLegalRuntime
    );

  const { siteSlug } = await params;

  let site;
  let brandTheme = null;
  let hours = null;

  try {
    [site, brandTheme, hours] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      getPublicBrandTheme(),
      getPublicHours(siteSlug),
    ]);
  } catch (error) {
    if (error.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  return (
    <PublicBrandLegalRuntime
      runtime={
        publicBrandLegalRuntime
      }
    >

    <div
      className="public-site-shell"
      style={
        brandTheme?.cssVariables || undefined
      }
    >
      <PublicSiteHeader
          brand={
            publicBrandLegalRuntime
              ?.runtime
              ?.brand ||
            null
          }

          brandRuntime={
            publicBrandLegalRuntime
          }
          brandAssets={
            publicBrandAssets
          }
        site={site}
        hours={hours}
      />

      <main><MiniSiteStructuredData params={params} />
        {children}</main>

      <PublicSiteFooter site={site} />
    </div>

    </PublicBrandLegalRuntime>
  );
}
