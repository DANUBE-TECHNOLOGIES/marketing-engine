import { NextResponse } from "next/server";

const BACKEND_URL = String(
  process.env.MONDESCALE_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://backend:4000"
).replace(/\/+$/, "");

const DEFAULT_TENANT_ID =
  process.env.MONDESCALE_TENANT_ID || "tenant_mondescale";

export async function GET(request) {
  const source = new URL(request.url);
  const target = new URL(`${BACKEND_URL}/api/assets`);

  target.searchParams.set("type", "MEDIA_IMAGE");
  target.searchParams.set("status", "published");
  target.searchParams.set(
    "limit",
    String(Math.min(100, Math.max(1, Number(source.searchParams.get("limit")) || 100)))
  );

  const search = String(source.searchParams.get("search") || "").trim();
  if (search) target.searchParams.set("search", search);

  const headers = new Headers();
  headers.set(
    "x-tenant-id",
    request.headers.get("x-tenant-id") || DEFAULT_TENANT_ID
  );
  headers.set("accept", "application/json");

  const requestId = request.headers.get("x-request-id");
  if (requestId) headers.set("x-request-id", requestId);

  try {
    const response = await fetch(target, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type":
          response.headers.get("content-type") || "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "MEDIA_LIBRARY_UNAVAILABLE",
        message: "La médiathèque du Website Designer est indisponible.",
        details: {
          cause: error?.message || "Connexion impossible",
        },
      },
      { status: 502 }
    );
  }
}

export const dynamic = "force-dynamic";
