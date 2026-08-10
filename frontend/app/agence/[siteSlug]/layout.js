import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../lib/public-site-api";
import { getPublicBrandTheme } from "../../../lib/public-brand-api";
import PublicSiteHeader from "../../../components/public-site/PublicSiteHeader";
import PublicSiteFooter from "../../../components/public-site/PublicSiteFooter";
import MiniSiteStructuredData from "../../../components/public-site/MiniSiteStructuredData";
import PublicBrandLegalRuntime from "../../../components/public-site/PublicBrandLegalRuntime";
import {
  fetchPublicBrandLegalRuntime,
  runtimeBrandAssets,
  runtimeCssVariables,
} from "../../../lib/public-brand-legal-runtime";

import "../../sites/[siteSlug]/public-site.css";
import "../../../components/public-site/brand-runtime.css";
import "../../../components/public-site/premium-public.css";
import "../../../components/public-site/premium-sections.css";

export default async function PublicAgencySiteLayout({ children, params }) {
  const { siteSlug } = await params;

  const publicBrandLegalRuntime = await fetchPublicBrandLegalRuntime(siteSlug);
  const publicBrandAssets = runtimeBrandAssets(publicBrandLegalRuntime);
  const runtimeTheme = runtimeCssVariables(publicBrandLegalRuntime);

  let site;
  let legacyBrandTheme = null;

  try {
    [site, legacyBrandTheme] = await Promise.all([
      publicSiteApi.getSite(siteSlug),
      getPublicBrandTheme(),
    ]);
  } catch (error) {
    if (error?.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  const hours = site?.hours || null;

  const cssVariables = {
    ...(legacyBrandTheme?.cssVariables || {}),
    ...runtimeTheme,
  };

  return (
    <PublicBrandLegalRuntime runtime={publicBrandLegalRuntime}>
      <div
        className="public-site-shell"
        style={Object.keys(cssVariables).length ? cssVariables : undefined}
      >
        <PublicSiteHeader
          brand={publicBrandLegalRuntime?.runtime?.brand || null}
          brandRuntime={publicBrandLegalRuntime}
          brandAssets={publicBrandAssets}
          site={site}
          hours={hours}
        />

        <main>
          <MiniSiteStructuredData params={params} />
          {children}
        </main>

        <PublicSiteFooter site={site} />
      </div>
    </PublicBrandLegalRuntime>
  );
}
