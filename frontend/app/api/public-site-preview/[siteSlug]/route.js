import {
  NextResponse,
} from "next/server";

const BACKEND_URL = String(
  process.env.MONDESCALE_BACKEND_URL ||
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  "http://backend:4000"
).replace(/\/+$/, "");

function forwardedHeaders(request) {
  const headers = new Headers({
    accept: "application/json",
    "content-type": "application/json",
  });

  for (const name of [
    "authorization",
    "cookie",
    "x-tenant-id",
    "x-tenant-slug",
    "x-request-id",
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  if (
    !headers.has("x-tenant-id") &&
    !headers.has("x-tenant-slug")
  ) {
    headers.set("x-tenant-slug", "mondescale");
  }

  return headers;
}

export async function POST(request, { params }) {
  const { siteSlug } = await params;

  if (!siteSlug) {
    return NextResponse.json(
      {
        error: "PUBLIC_SITE_PREVIEW_SLUG_REQUIRED",
        message: "Le mini-site est obligatoire.",
      },
      { status: 400 }
    );
  }

  let payload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "PUBLIC_SITE_PREVIEW_BODY_INVALID",
        message: "Le corps JSON est invalide.",
      },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_URL}/api/public-site-read/sites/${encodeURIComponent(siteSlug)}/preview-hydrate`,
      {
        method: "POST",
        headers: forwardedHeaders(request),
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    const text = await response.text();
    let body;

    try {
      body = JSON.parse(text);
    } catch {
      body = {
        error: "PUBLIC_SITE_PREVIEW_INVALID_JSON",
        message: "Le service de preview a retourné une réponse invalide.",
      };
    }

    return NextResponse.json(body, {
      status: response.status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "PUBLIC_SITE_PREVIEW_UNAVAILABLE",
        message: "Le service de preview est indisponible.",
        details: {
          reason: error?.message || "unknown",
        },
      },
      { status: 502 }
    );
  }
}
