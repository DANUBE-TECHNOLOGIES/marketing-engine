const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  process.env.TENANT_SLUG ||
  "mondescale";

async function proxy(request, context) {
  const { path = [] } = await context.params;

  const target = new URL(
    `/public/agency-sites/${path.join("/")}`,
    BACKEND_URL
  );

  target.search = new URL(request.url).search;

  const response = await fetch(target, {
    method: request.method,
    headers: {
      accept: "application/json",
      "content-type":
        request.headers.get("content-type") ||
        "application/json",
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
    },
  });
}

export async function GET(request, context) {
  return proxy(request, context);
}
