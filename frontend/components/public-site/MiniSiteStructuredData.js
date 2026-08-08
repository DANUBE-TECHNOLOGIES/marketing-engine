import {
  fetchMiniSiteStructuredData,
} from "../../lib/minisite-structured-data/client";

import {
  serializeJsonLd,
} from "../../lib/minisite-structured-data/serializer";

async function resolveParams(
  params
) {
  if (
    params &&
    typeof params.then ===
      "function"
  ) {
    return await params;
  }

  return params || {};
}

export default async function MiniSiteStructuredData({
  params,
  siteSlug,
}) {
  const resolvedParams =
    await resolveParams(
      params
    );

  const resolvedSiteSlug =
    String(
      siteSlug ||
      resolvedParams.siteSlug ||
      ""
    ).trim();

  if (!resolvedSiteSlug) {
    return null;
  }

  const payload =
    await fetchMiniSiteStructuredData(
      resolvedSiteSlug
    );

  if (!payload?.graph) {
    return null;
  }

  return (
    <script
      id={`minisite-jsonld-${resolvedSiteSlug}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html:
          serializeJsonLd(
            payload.graph
          ),
      }}
    />
  );
}
