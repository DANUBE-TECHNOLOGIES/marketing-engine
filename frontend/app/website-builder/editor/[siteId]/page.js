import VisualPageBuilder from "../../../../components/page-builder-v2/VisualPageBuilder";
import FlexiblePaymentPolicyPanel from "../../../../components/page-builder-v2/FlexiblePaymentPolicyPanel";
import SeoDesignerContext from "../../../../components/page-builder-v2/SeoDesignerContext";

import "../../../sites/[siteSlug]/public-site.css";
import "../../../../components/public-site/brand-runtime.css";

export const dynamic = "force-dynamic";

function backendOrigin() {
  return String(
    process.env.BACKEND_INTERNAL_URL ||
      process.env.API_INTERNAL_URL ||
      "http://backend:4000"
  ).replace(/\/+$/g, "");
}

async function loadSeoBrief(agencyId, keywordId) {
  if (!agencyId || !keywordId) return null;

  try {
    const response = await fetch(
      `${backendOrigin()}/api/agency-launch/agencies/${agencyId}/readiness`,
      {
        headers: {
          Accept: "application/json",
          "x-tenant-slug":
            process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) return null;

    const report = await response.json();
    const briefs = report?.localContentBriefs?.briefs || [];

    return (
      briefs.find(
        (brief) => String(brief.keywordId) === String(keywordId)
      ) || null
    );
  } catch {
    return null;
  }
}

export default async function MiniSiteEditorPage({
  params,
  searchParams,
}) {
  const resolvedParams = await params;
  const query = (await searchParams) || {};
  const brief = await loadSeoBrief(
    query.seoAgencyId,
    query.seoKeywordId
  );

  return (
    <>
      <FlexiblePaymentPolicyPanel
        siteSlug={resolvedParams.siteId}
      />
      <VisualPageBuilder
        siteId={resolvedParams.siteId}
      />
      <SeoDesignerContext
        siteId={resolvedParams.siteId}
        pageSlug={query.seoPageSlug || ""}
        keyword={query.seoKeyword || ""}
        mode={query.seoMode || "monitor"}
        brief={brief}
      />
    </>
  );
}
