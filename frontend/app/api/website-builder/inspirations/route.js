const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

function tenantHeaders(request) {
  const tenantSlug =
    request.headers.get("x-tenant-slug") ||
    process.env.TENANT_SLUG ||
    process.env.NEXT_PUBLIC_TENANT_SLUG ||
    "mondescale";

  return {
    accept: "application/json",
    "x-tenant-slug": tenantSlug,
  };
}

export async function GET(request) {
  try {
    const requestUrl = new URL(request.url);
    const backendUrl = new URL(
      "/ai-content/published",
      BACKEND_URL
    );

    for (const name of ["limit", "channel", "ids", "agencyId"]) {
      const value = requestUrl.searchParams.get(name);
      if (value) backendUrl.searchParams.set(name, value);
    }

    const response = await fetch(backendUrl, {
      method: "GET",
      headers: tenantHeaders(request),
      cache: "no-store",
    });

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ||
          "application/json",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[WEBSITE_BUILDER_INSPIRATIONS]", error);

    return Response.json(
      {
        error: "Impossible de charger les inspirations publiées.",
      },
      {
        status: 502,
      }
    );
  }
}
