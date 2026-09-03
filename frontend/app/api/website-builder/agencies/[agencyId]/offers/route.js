const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.TENANT_SLUG ||
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function GET(request, context) {
  const { agencyId } = await context.params;
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");

  const backendUrl = new URL(
    "/campaigns/options/offers",
    BACKEND_URL
  );

  backendUrl.searchParams.set("agencyId", agencyId);

  if (limit) {
    backendUrl.searchParams.set("limit", limit);
  }

  const response = await fetch(backendUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-tenant-slug": TENANT_SLUG,
    },
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
}
