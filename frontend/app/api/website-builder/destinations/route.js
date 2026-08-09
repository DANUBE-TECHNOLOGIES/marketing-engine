const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

function tenantHeaders(request) {
  const tenantSlug =
    request.headers.get("x-tenant-slug") ||
    process.env.NEXT_PUBLIC_TENANT_SLUG ||
    "mondescale";

  return {
    accept: "application/json",
    "x-tenant-slug": tenantSlug,
  };
}

export async function GET(request) {
  try {
    const backendUrl =
      `${BACKEND_URL}/public/destinations?status=published`;

    const response = await fetch(
      backendUrl,
      {
        method: "GET",
        headers: tenantHeaders(request),
        cache: "no-store",
      }
    );

    const body = await response.text();

    return new Response(
      body,
      {
        status: response.status,
        headers: {
          "content-type":
            response.headers.get("content-type") ||
            "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "[WEBSITE_BUILDER_DESTINATIONS]",
      error
    );

    return Response.json(
      {
        error:
          "Impossible de charger les destinations.",
      },
      {
        status: 502,
      }
    );
  }
}
