import { notFound } from "next/navigation";

import { publicSiteApi } from "../../../lib/public-site-api";
import { getPublicBrandTheme } from "../../../lib/public-brand-api";
import PublicSiteHeader from "../../../components/public-site/PublicSiteHeader";
import PublicSiteFooter from "../../../components/public-site/PublicSiteFooter";
import PublicBrandLegalRuntime from "../../../components/public-site/PublicBrandLegalRuntime";
import PublicConversionCapture from "../../../components/public-site/PublicConversionCapture";
import JsonLd from "../../../components/JsonLd";
import { buildWebSiteSchema } from "../../../lib/seo/json-ld";
import {
  fetchPublicBrandLegalRuntime,
  runtimeBrandAssets,
  runtimeCssVariables,
} from "../../../lib/public-brand-legal-runtime";

import "../../sites/[siteSlug]/public-site.css";
import "../../../components/public-site/brand-runtime.css";
import "../../../components/public-site/premium-public.css";
import "../../../components/public-site/premium-sections.css";
import "../../../components/public-site/hero-finish.css";
import "../../../components/public-site/legal-experience.css";
import "../../../components/public-site/logo-emphasis.css";
import "../../../components/public-site/public-readability-fixes.css";
import "../../../components/public-site/seo-crawlability.css";
import "../../../components/public-site/desktop-composition.css";

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
      <JsonLd data={buildWebSiteSchema()} />
      <PublicConversionCapture siteSlug={siteSlug} />

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

        <main>{children}</main>

        <PublicSiteFooter site={site} />
      </div>
    </PublicBrandLegalRuntime>
  );
}
