const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

async function proxy(request, method) {
  const response = await fetch(
    `${BACKEND_URL}/agency-sites/partners/rollout`,
    {
      method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
      body: method === "POST" ? JSON.stringify(await request.json().catch(() => ({}))) : undefined,
      cache: "no-store",
    }
  );

  const body = await response.arrayBuffer();
  return new Response(body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(request) {
  return proxy(request, "GET");
}

export async function POST(request) {
  return proxy(request, "POST");
}
