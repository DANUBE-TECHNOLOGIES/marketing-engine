import {
  permanentRedirect,
} from "next/navigation";

export default async function LegacySitePage({
  params,
}) {
  const {
    siteSlug,
    pageSlug,
  } =
    await params;

  permanentRedirect(
    `/agence/${encodeURIComponent(
      siteSlug
    )}/${encodeURIComponent(
      pageSlug
    )}`
  );
}
