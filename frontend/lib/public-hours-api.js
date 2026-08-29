const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function getPublicHours(siteSlug) {
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
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    return null;
  }

  return response.json();
}
