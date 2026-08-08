import VisualBuilderV3 from "../../../../components/page-builder-v3/VisualBuilderV3";

export const dynamic = "force-dynamic";

export default async function VisualBuilderV3Page({
  params,
}) {
  const resolvedParams = await params;

  return (
    <VisualBuilderV3
      siteId={resolvedParams.siteId}
    />
  );
}
