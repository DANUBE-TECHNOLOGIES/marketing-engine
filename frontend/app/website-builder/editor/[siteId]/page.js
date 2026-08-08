import VisualPageBuilder from "../../../../components/page-builder-v2/VisualPageBuilder";

import "../../../sites/[siteSlug]/public-site.css";
import "../../../../components/public-site/brand-runtime.css";

export const dynamic = "force-dynamic";

export default async function MiniSiteEditorPage({
  params,
}) {
  const resolvedParams = await params;

  return (
    <VisualPageBuilder
      siteId={resolvedParams.siteId}
    />
  );
}
