import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_INTERNAL_URL || "http://backend:4000";
const TENANT_SLUG = process.env.TENANT_SLUG || process.env.NEXT_PUBLIC_TENANT_SLUG || "mondescale";

export async function PATCH(request, { params }) {
  const { actionId } = await params;
  const body = await request.json();
  const response = await fetch(`${BACKEND_URL}/rankings/grid/territorial-actions/${encodeURIComponent(actionId)}`, {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-tenant-slug": TENANT_SLUG,
    },
    body: JSON.stringify(body),
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
