import { cache } from "react";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

const PUBLIC_HOURS_REVALIDATE_SECONDS = Math.max(
  30,
  Number(process.env.PUBLIC_SITE_REVALIDATE_SECONDS || 300) || 300
);

const getPublicHours = cache(async (siteSlug) => {
  const response = await fetch(
    `${BACKEND_URL}/public/agency-sites/${encodeURIComponent(
      siteSlug
    )}/hours`,
    {
      headers: {
        accept: "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
      next: {
        revalidate: PUBLIC_HOURS_REVALIDATE_SECONDS,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
});

export {
  PUBLIC_HOURS_REVALIDATE_SECONDS,
  getPublicHours,
};
