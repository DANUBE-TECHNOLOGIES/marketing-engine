import { cache } from "react";
import { unstable_cache } from "next/cache";

import { loadPublicRenderContract } from "./public-render-contract.js";

const PUBLIC_SITE_REVALIDATE_SECONDS = Math.max(
  30,
  Number(process.env.PUBLIC_SITE_REVALIDATE_SECONDS || 300)
);

const loadPublicSiteContract = unstable_cache(
  async (siteSlug) => loadPublicRenderContract(siteSlug),
  ["mse-25-71-public-site-shell"],
  { revalidate: PUBLIC_SITE_REVALIDATE_SECONDS }
);

const getPublicSiteShell = cache(async (siteSlug) => {
  const contract = await loadPublicSiteContract(siteSlug);
  const site = contract?.site && typeof contract.site === "object"
    ? contract.site
    : contract;

  if (!site || typeof site !== "object") return site;

  return {
    ...site,
    navigation: contract?.navigation || site.navigation || [],
  };
});

export {
  PUBLIC_SITE_REVALIDATE_SECONDS,
  getPublicSiteShell,
};
