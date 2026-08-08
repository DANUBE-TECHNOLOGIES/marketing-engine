import VisualPageBuilder from "../../../../components/page-builder-v2/VisualPageBuilder";

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
