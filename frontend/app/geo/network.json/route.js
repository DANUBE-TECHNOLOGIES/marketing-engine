import {
  getBackendOrigin,
  tenantSlug,
} from "../../../lib/minisite-structured-data/client.js";

function backendGeoNetworkUrl() {
  return `${getBackendOrigin()}/minisite-structured-data/geo/network`;
}

export async function GET() {
  let response;
  try {
    response = await fetch(backendGeoNetworkUrl(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-tenant-slug": tenantSlug(),
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return Response.json({ error: "GEO_BACKEND_UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  if (!response.ok) {
    return Response.json({ error: "GEO_NETWORK_UNAVAILABLE" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const payload = await response.json();
  return Response.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
