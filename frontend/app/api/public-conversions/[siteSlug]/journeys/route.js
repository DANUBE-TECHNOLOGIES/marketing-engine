import { NextResponse } from "next/server";

const BACKEND_URL = String(
  process.env.BACKEND_INTERNAL_URL || process.env.MONDESCALE_BACKEND_URL || process.env.BACKEND_URL || "http://backend:4000"
).replace(/\/+$/, "");
const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

export async function POST(request, { params }) {
  const { siteSlug } = await params;
  if (!siteSlug) return NextResponse.json({ error: "PUBLIC_CONVERSION_SITE_REQUIRED" }, { status: 400 });
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "PUBLIC_JOURNEY_JSON_INVALID" }, { status: 400 }); }

  try {
    const response = await fetch(`${BACKEND_URL}/public/conversions/sites/${encodeURIComponent(siteSlug)}/journeys`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-tenant-slug": request.headers.get("x-tenant-slug") || TENANT_SLUG,
      },
      body: JSON.stringify(body || {}),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const payload = await response.json().catch(() => ({ accepted: response.ok }));
    return NextResponse.json(payload, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json(
      { accepted: false, error: "PUBLIC_JOURNEY_UNAVAILABLE" },
      { status: 202, headers: { "Cache-Control": "no-store" } }
    );
  }
}
