const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function GET(request, context) {
  const { contentSlug } = await context.params;
  const requestUrl = new URL(request.url);
  const agencyId = String(requestUrl.searchParams.get("agencyId") || "").trim();
  const backendUrl = new URL(
    `/ai-content/published/${encodeURIComponent(contentSlug)}`,
    BACKEND_URL
  );

  if (agencyId) {
    backendUrl.searchParams.set("agencyId", agencyId);
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
      "cache-control": response.ok
        ? "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        : "no-store",
    },
  });
}
