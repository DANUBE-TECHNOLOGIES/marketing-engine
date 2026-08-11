import VisualPageBuilder from "../../../../components/page-builder-v2/VisualPageBuilder";
import SeoDesignerContext from "../../../../components/page-builder-v2/SeoDesignerContext";

import "../../../sites/[siteSlug]/public-site.css";
import "../../../../components/public-site/brand-runtime.css";

export const dynamic = "force-dynamic";

export default async function MiniSiteEditorPage({
  params,
  searchParams,
}) {
  const resolvedParams = await params;
  const query = (await searchParams) || {};

  return (
    <>
      <VisualPageBuilder
        siteId={resolvedParams.siteId}
      />
      <SeoDesignerContext
        pageSlug={query.seoPageSlug || ""}
        keyword={query.seoKeyword || ""}
        mode={query.seoMode || "monitor"}
      />
    </>
  );
}
