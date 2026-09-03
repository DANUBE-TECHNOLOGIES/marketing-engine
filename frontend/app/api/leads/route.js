const BACKEND_URL = String(process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

export async function GET(request) {
  const incoming = new URL(request.url);
  const target = new URL(`${BACKEND_URL}/api/leads`);
  for (const [key, value] of incoming.searchParams.entries()) target.searchParams.set(key, value);

  try {
    const response = await fetch(target, {
      method: "GET",
      headers: { accept: "application/json", "x-tenant-slug": process.env.TENANT_SLUG || "mondescale" },
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
