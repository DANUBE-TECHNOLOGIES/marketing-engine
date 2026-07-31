import { NextResponse } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.INTERNAL_API_URL ||
  process.env.BACKEND_URL ||
  "http://backend:4000";

const TENANT_SLUG =
  process.env.TENANT_SLUG ||
  process.env.NEXT_PUBLIC_TENANT_SLUG ||
  "mondescale";

function errorResponse(error) {
  console.error("[CAMPAIGNS_PROXY_ERROR]", error);

  return NextResponse.json(
    {
      error: {
        code: "CAMPAIGNS_BACKEND_UNAVAILABLE",
        message: "Le service des campagnes est momentanément indisponible.",
      },
    },
    { status: 502 },
  );
}

async function forward(request, context) {
  try {
    const params = await context.params;
    const path = Array.isArray(params?.path) ? params.path : [];
    const incomingUrl = new URL(request.url);
    const backendUrl = new URL(
      `${BACKEND_URL}/campaigns${path.length ? `/${path.map(encodeURIComponent).join("/")}` : ""}`,
    );
    backendUrl.search = incomingUrl.search;

    const headers = new Headers({
      accept: request.headers.get("accept") || "application/json",
      "x-tenant-slug": TENANT_SLUG,
    });

    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    const hasBody = !["GET", "HEAD"].includes(request.method);
    const response = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = await response.text();
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") ||
          "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const dynamic = "force-dynamic";

export function GET(request, context) {
  return forward(request, context);
}

export function POST(request, context) {
  return forward(request, context);
}

export function PUT(request, context) {
  return forward(request, context);
}

export function PATCH(request, context) {
  return forward(request, context);
}

export function DELETE(request, context) {
  return forward(request, context);
}
