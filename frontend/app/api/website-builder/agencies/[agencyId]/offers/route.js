const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

export async function GET(request, context) {
  const { agencyId } = await context.params;
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");

  const backendUrl = new URL(
    `/api/public-site-read/agencies/${encodeURIComponent(
      agencyId
    )}/offers`,
    BACKEND_URL
  );

  if (limit) {
    backendUrl.searchParams.set("limit", limit);
  }

  const response = await fetch(backendUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
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
