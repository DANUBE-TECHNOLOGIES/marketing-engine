const BACKEND_URL = String(process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

export async function POST(_request, context) {
  const { id } = await context.params;
  const target = `${BACKEND_URL}/api/leads/${encodeURIComponent(id)}/notify`;

  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-tenant-slug": process.env.TENANT_SLUG || "mondescale",
      },
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json({ ok: false, error: "LEAD_NOTIFY_BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
