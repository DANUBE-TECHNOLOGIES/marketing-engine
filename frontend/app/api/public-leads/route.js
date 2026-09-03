const BACKEND_URL = String(process.env.MONDESCALE_BACKEND_URL || process.env.BACKEND_URL || "http://backend:4000").replace(/\/+$/, "");

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetch(`${BACKEND_URL}/api/public/leads`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-tenant-slug": "mondescale" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.json().catch(() => ({ ok: false, error: "INVALID_BACKEND_RESPONSE" }));
    return Response.json(payload, { status: response.status });
  } catch {
    return Response.json({ ok: false, error: "LEAD_SERVICE_UNAVAILABLE" }, { status: 503 });
  }
}
