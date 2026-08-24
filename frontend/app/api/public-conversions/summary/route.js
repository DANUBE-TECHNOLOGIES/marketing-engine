import { NextResponse } from "next/server";

const BACKEND_URL = String(
  process.env.BACKEND_INTERNAL_URL ||
  process.env.MONDESCALE_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000"
).replace(/\/+$/, "");

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

export async function GET(request) {
  const url = new URL(request.url);
  const search = new URLSearchParams();
  const siteSlug = url.searchParams.get("siteSlug");
  const days = url.searchParams.get("days");
  if (siteSlug) search.set("siteSlug", siteSlug);
  if (days) search.set("days", days);

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/conversions/summary${search.size ? `?${search.toString()}` : ""}`,
      {
        headers: {
          accept: "application/json",
          "x-tenant-slug": request.headers.get("x-tenant-slug") || TENANT_SLUG,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );
    const payload = await response.json().catch(() => ({ totalEvents: 0, rows: [] }));
    return NextResponse.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      { totalEvents: 0, rows: [], error: "PUBLIC_CONVERSION_SUMMARY_UNAVAILABLE" },
      { status: 502, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
