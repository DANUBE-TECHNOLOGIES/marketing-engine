const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

async function proxy(request, context, method) {
  const { agencyId, pageSlug } = await context.params;
  const normalizedSlug = pageSlug === "home" ? "home" : encodeURIComponent(pageSlug);
  const headers = {
    accept: "application/json",
    "x-tenant-slug": TENANT_SLUG,
  };
  const options = { method, headers, cache: "no-store" };

  if (method === "POST") {
    headers["content-type"] = "application/json";
    options.body = await request.text();
  }

  const response = await fetch(
    `${BACKEND_URL}/agencies/${encodeURIComponent(agencyId)}/site/pages/${normalizedSlug}/uniqueness`,
    options
  );
  const body = await response.arrayBuffer();

  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(request, context) {
  return proxy(request, context, "GET");
}

export async function POST(request, context) {
  return proxy(request, context, "POST");
}
