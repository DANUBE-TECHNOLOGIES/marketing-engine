import {
  permanentRedirect,
} from "next/navigation";

export default async function LegacySiteHome({
  params,
}) {
  const {
    siteSlug,
  } =
    await params;

  permanentRedirect(
    `/agence/${encodeURIComponent(
      siteSlug
    )}`
  );
}
