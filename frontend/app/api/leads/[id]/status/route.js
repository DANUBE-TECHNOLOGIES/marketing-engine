const BACKEND_URL = String(process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

export async function PATCH(request, { params }) {
  const { id } = await params;
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400 }); }

  try {
    const response = await fetch(`${BACKEND_URL}/api/leads/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-tenant-slug": process.env.TENANT_SLUG || "mondescale",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") || "application/json" },
    });
  } catch {
    return Response.json({ ok: false, error: "LEADS_BACKEND_UNAVAILABLE" }, { status: 502 });
  }
}
