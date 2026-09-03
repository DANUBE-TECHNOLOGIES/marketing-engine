import {
  permanentRedirect,
} from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VisualBuilderV3FallbackPage({
  params,
}) {
  const {
    siteId,
  } = await params;

  permanentRedirect(
    `/website-builder/editor/${encodeURIComponent(
      siteId
    )}`
  );
}
