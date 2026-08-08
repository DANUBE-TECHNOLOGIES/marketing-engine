import {
  NextResponse,
} from "next/server";

const BACKEND_URL = String(
  process.env.BACKEND_INTERNAL_URL ||
  process.env.MONDESCALE_BACKEND_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000"
).replace(/\/+$/, "");

const TENANT_SLUG =
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

export async function GET(request, { params }) {
  const { siteSlug } = await params;

  if (!siteSlug) {
    return NextResponse.json(
      {
        error: "PUBLIC_SITE_HOURS_SLUG_REQUIRED",
        message: "Le mini-site est obligatoire.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/public/agency-sites/${encodeURIComponent(siteSlug)}/hours`,
      {
        headers: {
          accept: "application/json",
          "x-tenant-slug":
            request.headers.get("x-tenant-slug") ||
            TENANT_SLUG,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { hours: null },
        {
          status: response.status,
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const hours = await response.json();

    return NextResponse.json(
      { hours },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        hours: null,
        error: "PUBLIC_SITE_HOURS_UNAVAILABLE",
        message: error?.message || "Service horaires indisponible.",
      },
      { status: 502 }
    );
  }
}
