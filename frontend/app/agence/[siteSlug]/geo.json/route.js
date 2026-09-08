import {
  getBackendOrigin,
  tenantSlug,
} from "../../../../lib/minisite-structured-data/client.js";

function backendGeoUrl(siteSlug) {
  return `${getBackendOrigin()}/minisite-structured-data/sites/${encodeURIComponent(siteSlug)}/geo`;
}

export async function GET(_request, context) {
  const params = await context.params;
  const siteSlug = String(params?.siteSlug || "").trim();

  if (!siteSlug) {
    return Response.json({ error: "GEO_SITE_NOT_FOUND" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  let response;
  try {
    response = await fetch(backendGeoUrl(siteSlug), {
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
    return Response.json({ error: "GEO_SITE_NOT_FOUND" }, { status: response.status === 404 ? 404 : 502, headers: { "Cache-Control": "no-store" } });
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
