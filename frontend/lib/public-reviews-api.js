const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function getPublicReviews(
  siteSlug,
  limit = 6
) {
  const response = await fetch(
    `${BACKEND_URL}/public/agency-sites/${encodeURIComponent(
      siteSlug
    )}/reviews?limit=${limit}`,
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
    const error = new Error(
      "Impossible de charger les avis Google."
    );

    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}
