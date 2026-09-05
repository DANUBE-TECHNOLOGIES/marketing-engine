import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const TENANT_SLUG = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

async function proxy(path, init = {}) {
  const response = await fetch(`${BACKEND_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "content-type": "application/json",
      "x-tenant-slug": TENANT_SLUG,
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { error: text || `backend_${response.status}` };
  }
  return NextResponse.json(payload, { status: response.status });
}

export async function GET(request) {
  const url = new URL(request.url);
  const agencyId = url.searchParams.get("agencyId") || "";
  const keywordId = url.searchParams.get("keywordId") || "";
  const query = new URLSearchParams({ agencyId, keywordId });
  return proxy(`/rankings/grid/territorial-actions?${query.toString()}`);
}

export async function POST(request) {
  const body = await request.json();
  return proxy("/rankings/grid/territorial-actions", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
