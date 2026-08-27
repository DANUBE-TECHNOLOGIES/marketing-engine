import { notFound } from "next/navigation";

import { getPublicSiteShell } from "../../../lib/public-site-shell-api";
import { getPublicBrandTheme } from "../../../lib/public-brand-api";
import PublicSiteHeader from "../../../components/public-site/PublicSiteHeader";
import PublicSiteFooter from "../../../components/public-site/PublicSiteFooter";
import PublicBrandLegalRuntime from "../../../components/public-site/PublicBrandLegalRuntime";
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
import "../../../components/public-site/network-home-hero.css";
import "../../../components/public-site/legal-experience.css";
import "../../../components/public-site/logo-emphasis.css";
import "../../../components/public-site/public-readability-fixes.css";
import "../../../components/public-site/seo-crawlability.css";
import "../../../components/public-site/public-performance.css";

export const revalidate = 300;

export default async function PublicAgencySiteLayout({ children, params }) {
  const { siteSlug } = await params;

  let site;
  let publicBrandLegalRuntime = null;

  try {
    [site, publicBrandLegalRuntime] = await Promise.all([
      getPublicSiteShell(siteSlug),
      fetchPublicBrandLegalRuntime(siteSlug),
    ]);
  } catch (error) {
    if (error?.statusCode === 404) {
      notFound();
    }

    throw error;
  }

  const publicBrandAssets = runtimeBrandAssets(publicBrandLegalRuntime);
  const runtimeTheme = runtimeCssVariables(publicBrandLegalRuntime);
  const hasRuntimeTheme = Object.keys(runtimeTheme).length > 0;
  const legacyBrandTheme = hasRuntimeTheme ? null : await getPublicBrandTheme();

  const cssVariables = {
    ...(legacyBrandTheme?.cssVariables || {}),
    ...runtimeTheme,
  };

  return (
    <PublicBrandLegalRuntime runtime={publicBrandLegalRuntime}>
      <JsonLd data={buildWebSiteSchema()} />

      <div
        className="public-site-shell"
        style={Object.keys(cssVariables).length ? cssVariables : undefined}
      >
        <PublicSiteHeader
          brand={publicBrandLegalRuntime?.runtime?.brand || null}
          brandRuntime={publicBrandLegalRuntime}
          brandAssets={publicBrandAssets}
          site={site}
        />

        <main>{children}</main>

        <PublicSiteFooter site={site} />
      </div>
    </PublicBrandLegalRuntime>
  );
}
