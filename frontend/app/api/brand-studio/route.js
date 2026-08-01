const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

async function forward(request) {
  const response = await fetch(
    `${BACKEND_URL}/brand`,
    {
      method: request.method,
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-tenant-slug": TENANT_SLUG,
      },
      body:
        request.method === "PUT"
          ? await request.text()
          : undefined,
      cache: "no-store",
    }
  );

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

export async function GET(request) {
  return forward(request);
}

export async function PUT(request) {
  return forward(request);
}
